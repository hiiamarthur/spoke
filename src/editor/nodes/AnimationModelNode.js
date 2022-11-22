import { Box3, Sphere, PropertyBinding } from "three";
import Model from "../objects/Model";
import EditorNodeMixin from "./EditorNodeMixin";
import { setStaticMode, StaticModes } from "../StaticMode";
import cloneObject3D from "../utils/cloneObject3D";
import { getComponents } from "../gltf/moz-hubs-components";
import { RethrownError } from "../utils/errors";
import { getObjectPerfIssues, maybeAddLargeFileIssue } from "../utils/performance";

const defaultStats = {
  nodes: 0,
  meshes: 0,
  materials: 0,
  textures: 0,
  polygons: 0,
  vertices: 0,
  jsonSize: 0,
  bufferInfo: {},
  textureInfo: {},
  meshInfo: {}
};

export default class AnimationModelNode extends EditorNodeMixin(Model) {
  static nodeName = "AnimationModel";

  static componentName = "animation-gltf-model";

  static async deserialize(editor, json, loadAsync, onError) {
    const node = await super.deserialize(editor, json);

    loadAsync(
      (async () => {
        const { src, attribution } = json.components.find(c => c.name === this.componentName).props;

        await node.load(src, onError);

        node.attribution = attribution;
        node.combine = !!json.components.find(c => c.name === "combine");

        const animationComponent = json.components.find(c => c.name === "animation-model");
        if (animationComponent && animationComponent.props) {
          node.activeClipItem = animationComponent.props.activeClipIndex;
          node.animationStartTime = animationComponent.props.animationStartTime;
          node.audioNode = animationComponent.props.audioNode;
        }
      })()
    );

    return node;
  }

  constructor(editor) {
    super(editor);
    this.attribution = null;
    this._canonicalUrl = "";
    this.activeClipItem = null;
    this.combine = true;
    this.audioNode = null;
    this.initialScale = 1;
    this.boundingBox = new Box3();
    this.boundingSphere = new Sphere();
    this.stats = defaultStats;
    this.gltfJson = null;
  }

  // Overrides Model's src property and stores the original (non-resolved) url.
  get src() {
    return this._canonicalUrl;
  }

  // When getters are overridden you must also override the setter.
  set src(value) {
    this.load(value).catch(console.error);
  }

  // Overrides Model's loadGLTF method and uses the Editor's gltf cache.
  async loadGLTF(src) {
    const loader = this.editor.gltfCache.getLoader(src);

    const { scene, json, stats } = await loader.getDependency("gltf");

    this.stats = stats;
    this.gltfJson = json;

    const clonedScene = cloneObject3D(scene);

    this.updateAttribution();

    return clonedScene;
  }

  // Overrides Model's load method and resolves the src url before loading.
  async load(src, onError) {
    const nextSrc = src || "";

    if (nextSrc === this._canonicalUrl && nextSrc !== "") {
      return;
    }

    this._canonicalUrl = nextSrc;
    this.attribution = null;
    this.issues = [];
    this.stats = defaultStats;
    this.gltfJson = null;

    if (this.model) {
      this.editor.renderer.removeBatchedObject(this.model);
      this.remove(this.model);
      this.model = null;
    }

    this.hideErrorIcon();
    this.showLoadingCube();

    try {
      const { accessibleUrl, files, meta } = await this.editor.api.resolveMedia(src);

      this.meta = meta;

      if (this.model) {
        this.editor.renderer.removeBatchedObject(this.model);
      }

      await super.load(accessibleUrl);

      if (this.stats) {
        const textureInfo = this.stats.textureInfo;
        for (const key in textureInfo) {
          if (!Object.prototype.hasOwnProperty.call(textureInfo, key)) continue;
          const info = textureInfo[key];

          if (info.size === undefined) {
            let file;

            for (const name in files) {
              if (Object.prototype.hasOwnProperty.call(files, name) && files[name].url === info.url) {
                file = files[name];
                break;
              }
            }

            if (file) {
              info.size = file.size;
              this.stats.totalSize += file.size;
            }
          }
        }
      }

      if (this.model) {
        this.editor.renderer.addBatchedObject(this.model);
      }

      if (this.initialScale === "fit") {
        this.scale.set(1, 1, 1);

        if (this.model) {
          this.updateMatrixWorld();
          this.boundingBox.setFromObject(this.model);
          this.boundingBox.getBoundingSphere(this.boundingSphere);

          const diameter = this.boundingSphere.radius * 2;

          if ((diameter > 1000 || diameter < 0.1) && diameter !== 0) {
            // Scale models that are too big or to small to fit in a 1m bounding sphere.
            const scaleFactor = 1 / diameter;
            this.scale.set(scaleFactor, scaleFactor, scaleFactor);
          } else if (diameter > 20) {
            // If the bounding sphere of a model is over 20m in diameter, assume that the model was
            // exported with units as centimeters and convert to meters.
            this.scale.set(0.01, 0.01, 0.01);
          }
        }

        // Clear scale to fit property so that the swapped model maintains the same scale.
        this.initialScale = 1;
      } else {
        this.scale.multiplyScalar(this.initialScale);
        this.initialScale = 1;
      }

      if (this.model) {
        this.model.traverse(object => {
          if (object.material && object.material.isMeshStandardMaterial) {
            object.material.envMap = this.editor.scene.environmentMap;
            object.material.needsUpdate = true;
          }
        });

        this.issues = getObjectPerfIssues(this.model);
        maybeAddLargeFileIssue("gltf", this.stats.totalSize, this.issues);
      }

      this.updateStaticModes();
    } catch (error) {
      this.showErrorIcon();

      const modelError = new RethrownError(`Error loading model "${this._canonicalUrl}"`, error);

      if (onError) {
        onError(this, modelError);
      }

      console.error(modelError);

      this.issues.push({ severity: "error", message: "Error loading model." });
    }

    this.editor.emit("objectsChanged", [this]);
    this.editor.emit("selectionChanged");
    this.hideLoadingCube();

    return this;
  }

  getAttribution() {
    // Sketchfab models use an extra object inside the asset object
    // Blender exporters add a copyright property to the asset object
    const name = this.name.replace(/\.[^/.]+$/, "");
    const assetDef = this.gltfJson.asset;
    const attributions = {};
    Object.assign(
      attributions,
      assetDef.extras && assetDef.extras.author
        ? { author: assetDef.extras.author }
        : (assetDef.copyright && { author: assetDef.copyright }) || null,
      assetDef.extras && assetDef.extras.source ? { url: assetDef.extras.source } : null,
      assetDef.extras && assetDef.extras.title ? { title: assetDef.extras.title } : this.name ? { title: name } : null
    );
    return attributions;
  }

  onAdd() {
    if (this.model) {
      this.editor.renderer.addBatchedObject(this.model);
    }
  }

  onRemove() {
    if (this.model) {
      this.editor.renderer.removeBatchedObject(this.model);
    }
  }

  onPlay() {
    this.playAnimation();
  }

  onPause() {
    this.stopAnimation();
  }

  onUpdate(dt) {
    super.onUpdate(dt);

    if (this.editor.playing) {
      this.update(dt);
    }
  }

  updateStaticModes() {
    if (!this.model) return;

    setStaticMode(this.model, StaticModes.Static);

    if (this.model.animations && this.model.animations.length > 0) {
      for (const animation of this.model.animations) {
        for (const track of animation.tracks) {
          const { nodeName: uuid } = PropertyBinding.parseTrackName(track.name);
          const animatedNode = this.model.getObjectByProperty("uuid", uuid);

          if (!animatedNode) {
            throw new Error(
              `Model.updateStaticModes: model with url "${this._canonicalUrl}" has an invalid animation "${animation.name}"`
            );
          }

          setStaticMode(animatedNode, StaticModes.Dynamic);
        }
      }
    }
  }

  serialize() {
    const components = {
      "animation-gltf-model": {
        src: this._canonicalUrl,
        attribution: this.attribution
      }
    };

    if (this.activeClipItem !== undefined) {
      components["animation-model"] = {
        activeClipIndex: this.activeClipItem,
        animationStartTime: this.animationStartTime,
        audioNode: this.audioNode
      };
    }

    if (this.combine) {
      components.combine = {};
    }

    return super.serialize(components);
  }

  copy(source, recursive = true) {
    super.copy(source, recursive);

    if (source.loadingCube) {
      this.initialScale = source.initialScale;
      this.load(source.src);
    } else {
      this.stats = JSON.parse(JSON.stringify(source.stats));
      this.gltfJson = source.gltfJson;
      this._canonicalUrl = source._canonicalUrl;
    }

    this.attribution = source.attribution;
    this.combine = source.combine;
    this.activeClipItem = source.activeClipItem;
    this.animationStartTime = source.animationStartTime;
    this.audioNode = source.audioNode;

    this.updateStaticModes();

    return this;
  }

  prepareForExport(ctx) {
    super.prepareForExport();

    this.addGLTFComponent("networked", {
      id: this.uuid
    });

    const clipIndex =
      this.activeClipItem !== undefined ? ctx.animations.indexOf(this.model.animations[this.activeClipItem]) : -1;

    if (clipIndex !== -1) {
      this.model.traverse(child => {
        const components = getComponents(child);
        if (components && components["animation-model"]) {
          delete components["animation-model"];
        }
      });

      this.addGLTFComponent("animation-model", {
        activeClipIndex: clipIndex,
        animationStartTime: this.animationStartTime,
        audioNode: this.gltfIndexForUUID(this.audioNode)
      });
    }
  }
}
