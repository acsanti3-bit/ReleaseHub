import "./KpiCard.css";

interface Props {

  titulo: string;

  valor: number;

  cor: string;

}

function KpiCard({

  titulo,

  valor,

  cor,

}: Props) {

  return (

    <div
      className="kpi-card"
      style={{
        borderTop: `6px solid ${cor}`,
      }}
    >

      <span className="kpi-title">

        {titulo}

      </span>

      <strong className="kpi-value">

        {valor}

      </strong>

    </div>

  );

}

export default KpiCard;