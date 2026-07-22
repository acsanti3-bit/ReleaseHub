import "./StatusBar.css";

interface Props {
  label: string;
  value: number;
  total: number;
  color: string;
}

function StatusBar({
  label,
  value,
  total,
  color,
}: Props) {

  const percent =
    total === 0
      ? 0
      : (value / total) * 100;

  return (

    <div className="status-bar">

      <span className="status-label">

        {label}

      </span>

      <div className="status-progress">

        <div
          className="status-fill"
          style={{
            width: `${percent}%`,
            background: color,
          }}
        />

      </div>

      <strong>

        {value}

      </strong>

    </div>

  );

}

export default StatusBar;