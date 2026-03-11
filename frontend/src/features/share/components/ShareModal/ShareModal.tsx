import { useState } from "react";
import { Modal, Form, Spinner } from "react-bootstrap";
import { Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import type { MovieData } from "@/types";
import { ShareCard } from "../ShareCard/ShareCard";
import type { ShareOptions } from "../ShareCard/ShareCard";
import { useShare } from "../../hooks/useShare";
import { useModalBack } from "@/hooks/useModalBack";

interface ShareModalProps {
   show: boolean;
   movie: MovieData | null;
   onHide: () => void;
}

export function ShareModal({ show, movie, onHide }: ShareModalProps) {
    useModalBack(show, onHide);

   const { shareRef, isSharing, handleShareImage, handleShareLink } = useShare();
   const [options, setOptions] = useState<ShareOptions>({
      showTitle: true,
      showDetails: true,
      showRating: true,
      showVerdict: true,
   });

   if (!movie) return null;

   const onGenerateImage = async () => {
      await handleShareImage(movie);
      onHide();
   };

   const onShareDirectLink = async () => {
      await handleShareLink(movie);
      onHide();
   };

   return (
      <Modal show={show} onHide={onHide} centered backdrop="static">
         <Modal.Header closeButton className="border-0 pb-0">
            <Modal.Title className="fw-bold">Partilhar Avaliação</Modal.Title>
         </Modal.Header>
         <Modal.Body>
            <p className="text-muted mb-4">Como prefere compartilhar a sua avaliação de <strong>{movie.title}</strong>?</p>
            
            {/* ─── BOTÃO DE LINK DIRETO ─── */}
            <button 
                className="btn btn-outline-warning w-100 mb-4 d-flex align-items-center justify-content-center gap-2 py-3"
                onClick={onShareDirectLink}
                style={{ borderRadius: 'var(--radius-md)', fontWeight: 'bold' }}
            >
                <LinkIcon size={20} />
                Enviar Link
            </button>

            <div className="d-flex align-items-center gap-3 mb-4">
               <hr className="flex-grow-1" style={{ borderColor: 'var(--border-subtle)' }} />
               <span className="text-muted small fw-bold text-uppercase">Ou Gerar Imagem</span>
               <hr className="flex-grow-1" style={{ borderColor: 'var(--border-subtle)' }} />
            </div>
            
            {/* ─── OPÇÕES DA IMAGEM ─── */}
            <div className="d-flex flex-column gap-3 p-3 mb-3" style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
               <Form.Check 
                  type="switch" label="Mostrar Título" 
                  checked={options.showTitle} onChange={(e) => setOptions({...options, showTitle: e.target.checked})} 
               />
               <Form.Check 
                  type="switch" label="Mostrar Ano e Diretor" 
                  checked={options.showDetails} onChange={(e) => setOptions({...options, showDetails: e.target.checked})} 
               />
               <Form.Check 
                  type="switch" label="Mostrar Nota (Estrelas)" 
                  checked={options.showRating} onChange={(e) => setOptions({...options, showRating: e.target.checked})} 
               />
               <Form.Check 
                  type="switch" label="Mostrar Veredito (Badge)" 
                  checked={options.showVerdict} onChange={(e) => setOptions({...options, showVerdict: e.target.checked})} 
               />
            </div>

            {/* O CARD INVISÍVEL FICA AQUI DENTRO AGORA */}
            <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
               <ShareCard ref={shareRef} movie={movie} options={options} />
            </div>

         </Modal.Body>
         <Modal.Footer className="border-0">
            <button className="btn btn-secondary rounded-pill px-4" onClick={onHide} disabled={isSharing}>
               Cancelar
            </button>
            <button className="btn btn-warning rounded-pill px-4 fw-bold" onClick={onGenerateImage} disabled={isSharing}>
               {isSharing ? <Spinner size="sm" /> : <><ImageIcon size={16} className="me-2"/> Criar Imagem</>}
            </button>
         </Modal.Footer>
      </Modal>
   );
}