import { Object3D } from "three";
import EditorNodeMixin from "./EditorNodeMixin";

export default class EffectNode extends EditorNodeMixin(Object3D) {
  static componentName = "effect";

  static nodeName = "Effect";

  static async deserialize(editor, json) {
    const node = await super.deserialize(editor, json);

    const { bloomEnabled, bloomStrength, bloomRadius, bloomThreshold } = json.components.find(
      c => c.name === EffectNode.componentName
    ).props;

    node.bloomEnabled = bloomEnabled === undefined ? false : bloomEnabled;
    node.bloomStrength = bloomStrength === undefined ? 1.0 : bloomStrength;
    node.bloomRadius = bloomRadius === undefined ? 0.1 : bloomRadius;
    node.bloomThreshold = bloomThreshold === undefined ? 1.0 : bloomThreshold;

    return node;
  }

  constructor(editor) {
    super(editor);

    this.bloomEnabled = false;
    this.bloomStrength = 1.0;
    this.bloomRadius = 0.1;
    this.bloomThreshold = 1.0;
  }

  copy(source, recursive = true) {
    super.copy(source, recursive);

    this.bloomEnabled = source.bloomEnabled;
    this.bloomStrength = source.bloomStrength;
    this.bloomRadius = source.bloomRadius;
    this.bloomThreshold = source.bloomThreshold;

    return this;
  }

  serialize() {
    return super.serialize({
      [EffectNode.componentName]: {
        bloomEnabled: this.bloomEnabled,
        bloomStrength: this.bloomStrength,
        bloomRadius: this.bloomRadius,
        bloomThreshold: this.bloomThreshold
      }
    });
  }

  prepareForExport() {
    super.prepareForExport();

    this.addGLTFComponent(EffectNode.componentName, {
      bloomEnabled: this.bloomEnabled,
      bloomStrength: this.bloomStrength,
      bloomRadius: this.bloomRadius,
      bloomThreshold: this.bloomThreshold
    });
  }
}
