import styles from "./ConfidenceBadge.module.css";
import { formatConfidenceLabel } from "../utils/findingPresentation";

export default function ConfidenceBadge({
  confidence
}: {
  confidence: number;
}) {
  return (
    <span className={styles.badge} aria-label={formatConfidenceLabel(confidence)}>
      {formatConfidenceLabel(confidence)}
    </span>
  );
}