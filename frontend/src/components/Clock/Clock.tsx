import { useEffect, useState } from "react";
import "./Clock.css";

function Clock() {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDate(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="clock">
      <h2>{date.toLocaleDateString("pt-BR")}</h2>

      <h1>
        {date.toLocaleTimeString("pt-BR")}
      </h1>

      <span>Última atualização</span>
    </div>
  );
}

export default Clock;