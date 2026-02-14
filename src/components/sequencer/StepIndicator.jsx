import { useSelector } from "react-redux";
import cn from "classnames";

const StepIndicator = ({ stepIndex }) => {
  const currentStep = useSelector(state => state.sequencer.currentStep);
  const isStepIndicatorActive = stepIndex === currentStep;

  const stepIndicatorStyle = cn("step-indicator-button", {
    "step-indicator-button-active": isStepIndicatorActive,
  });

  return <button className={stepIndicatorStyle} />;
};

export default StepIndicator;
