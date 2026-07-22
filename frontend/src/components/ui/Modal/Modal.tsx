import "./Modal.css";
import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

function Modal({
  title,
  children,
  onClose
}: Props) {

  return (

    <div className="modal-overlay">

      <div className="modal-container">

        <div className="modal-header">

          <h2>{title}</h2>

          <button
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        <div className="modal-content">

          {children}

        </div>

      </div>

    </div>

  );

}

export default Modal;