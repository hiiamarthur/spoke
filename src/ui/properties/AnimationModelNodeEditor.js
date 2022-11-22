import React, { Component } from "react";
import PropTypes from "prop-types";
import NodeEditor from "./NodeEditor";
import SelectInput from "../inputs/SelectInput";
import InputGroup from "../inputs/InputGroup";
import BooleanInput from "../inputs/BooleanInput";
import NumericInputGroup from "../inputs/NumericInputGroup";
import ModelInput from "../inputs/ModelInput";
import { PlayCircle } from "styled-icons/fa-solid/PlayCircle";
import { GLTFInfo } from "../inputs/GLTFInfo";
import AttributionNodeEditor from "./AttributionNodeEditor";

export default class AnimationModelNodeEditor extends Component {
  static propTypes = {
    editor: PropTypes.object,
    node: PropTypes.object,
    multiEdit: PropTypes.bool
  };

  static iconComponent = PlayCircle;

  static description =
    "Place an animated 3D model that plays in sync with the audio in the scene. Loaded from a GLTF URL or file.";

  constructor(props) {
    super(props);

    this.state = {
      options: []
    };
  }

  onChangeSrc = (src, initialProps) => {
    this.props.editor.setPropertiesSelected({ ...initialProps, src });
  };

  onChangeAnimation = activeClipItem => {
    this.props.editor.setPropertiesSelected({
      activeClipItem: activeClipItem,
      animationStartTime: 0
    });
  };

  onChangeAnimationStartTime = animationStartTime => {
    this.props.editor.setPropertySelected("animationStartTime", animationStartTime);
  };

  onChangeAudioNode = audioNode => {
    this.props.editor.setPropertiesSelected({
      audioNode
    });
  };

  onChangeCombine = combine => {
    this.props.editor.setPropertySelected("combine", combine);
  };

  isAnimationPropertyDisabled() {
    const { multiEdit, editor, node } = this.props;

    if (multiEdit) {
      return editor.selected.some(selectedNode => selectedNode.src !== node.src);
    }

    return false;
  }

  componentDidMount() {
    const options = [];
    const sceneNode = this.props.editor.scene;

    sceneNode.traverse(o => {
      if (o.isNode && o.nodeName === "Audio") {
        options.push({ label: o.name, value: o.uuid, nodeName: o.nodeName });
      }
    });

    this.setState({ options });
  }

  render() {
    const { node, multiEdit } = this.props;

    return (
      <NodeEditor description={AnimationModelNodeEditor.description} {...this.props}>
        <InputGroup name="Model Url">
          <ModelInput value={node.src} onChange={this.onChangeSrc} />
        </InputGroup>
        <InputGroup name="Animation">
          <SelectInput
            disabled={this.isAnimationPropertyDisabled()}
            options={node.getClipOptions()}
            value={node.activeClipItem}
            onChange={this.onChangeAnimation}
          />
        </InputGroup>
        <NumericInputGroup
          name="Animation Start Time"
          value={node.animationStartTime}
          onChange={this.onChangeAnimationStartTime}
          smallStep={0.01}
          mediumStep={0.1}
          largeStep={1}
          min={0}
          unit="sec"
        />
        <InputGroup name="Link Audio Node">
          <SelectInput
            disabled={multiEdit}
            placeholder={node.audioNode || "Select audio node..."}
            options={this.state.options}
            value={node.audioNode}
            onChange={this.onChangeAudioNode}
            className="audio-select"
          />
        </InputGroup>
        <InputGroup name="Combine">
          <BooleanInput value={node.combine} onChange={this.onChangeCombine} />
        </InputGroup>
        {node.model && <GLTFInfo node={node} />}
        <AttributionNodeEditor name="Attribution" {...this.props} />
      </NodeEditor>
    );
  }
}
