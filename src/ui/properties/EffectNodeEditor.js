import React from "react";
import PropTypes from "prop-types";
import NodeEditor from "./NodeEditor";
import InputGroup from "../inputs/InputGroup";
import BooleanInput from "../inputs/BooleanInput";
import NumericInputGroup from "../inputs/NumericInputGroup";
import useSetPropertySelected from "./useSetPropertySelected";
import { Fire } from "styled-icons/fa-solid/Fire";

export default function EffectNodeEditor(props) {
  const { editor, node } = props;

  const onChangeBloomEnabled = useSetPropertySelected(editor, "bloomEnabled");
  const onChangeBloomStrength = useSetPropertySelected(editor, "bloomStrength");
  const onChangeBloomRadius = useSetPropertySelected(editor, "bloomRadius");
  const onChangeBloomThreshold = useSetPropertySelected(editor, "bloomThreshold");

  return (
    <NodeEditor {...props} description={EffectNodeEditor.description}>
      <InputGroup name="Bloom Enabled">
        <BooleanInput value={node.bloomEnabled} onChange={onChangeBloomEnabled} />
      </InputGroup>
      {node.bloomEnabled && (
        <>
          <NumericInputGroup
            name="Bloom Strength"
            smallStep={0.01}
            mediumStep={0.1}
            largeStep={1}
            min={0}
            value={node.bloomStrength}
            onChange={onChangeBloomStrength}
          />
          <NumericInputGroup
            name="Bloom Radius"
            smallStep={0.01}
            mediumStep={0.1}
            largeStep={1}
            min={0}
            value={node.bloomRadius}
            onChange={onChangeBloomRadius}
          />
          <NumericInputGroup
            name="Bloom Threshold"
            smallStep={0.01}
            mediumStep={0.1}
            largeStep={1}
            min={0}
            value={node.bloomThreshold}
            onChange={onChangeBloomThreshold}
          />
        </>
      )}
    </NodeEditor>
  );
}

EffectNodeEditor.iconComponent = Fire;

EffectNodeEditor.description = "An effect applied to the entire scene.";

EffectNodeEditor.propTypes = {
  editor: PropTypes.object,
  node: PropTypes.object
};
