import type { FC } from "react";
import { Modal } from "react-bootstrap";
import type { GameHelp } from "../logic/gameHelpContent";

interface GamesHelpModalProps {
   open: boolean;
   onClose: () => void;
   help: GameHelp | null;
}

export const GamesHelpModal: FC<GamesHelpModalProps> = ({ open, onClose, help }) => {
   return (
      <Modal show={open} onHide={onClose} centered className="helpModal">
         <Modal.Header closeButton>
            <Modal.Title>{help?.title || "Como jogar"}</Modal.Title>
         </Modal.Header>
         <Modal.Body style={{ whiteSpace: "pre-line" }}>{help?.content}</Modal.Body>
      </Modal>
   );
};
