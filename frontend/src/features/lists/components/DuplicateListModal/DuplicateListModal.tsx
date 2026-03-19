import { useEffect, useState, type FormEvent } from "react";
import { Form, Modal, Spinner } from "react-bootstrap";
import { Copy, Globe, Lock, Users, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth";
import toast from "react-hot-toast";
import { generateDuplicateTitle, type ListType } from "../../logic/listSocial";
import styles from "./DuplicateListModal.module.css";

interface DuplicateListModalProps {
  show: boolean;
  onHide: () => void;
  originalTitle: string;
  onConfirm: (
    newName: string,
    type: ListType,
    collaboratorIds: string[],
    copyRatings: boolean,
    ratingsExclusiveToList: boolean
  ) => Promise<void>;
  isProcessing: boolean;
}

export function DuplicateListModal({
  show,
  onHide,
  originalTitle,
  onConfirm,
  isProcessing
}: DuplicateListModalProps) {
  const { session } = useAuth();
  const [newName, setNewName] = useState(() => generateDuplicateTitle(originalTitle));
  const [selectedType, setSelectedType] = useState<ListType>("private");
  const [friends, setFriends] = useState<{ id: string; username: string; avatar_url: string }[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [copyRatings, setCopyRatings] = useState(true);
  const [ratingsExclusiveToList, setRatingsExclusiveToList] = useState(true);

  const handleModalShow = () => {
    setNewName(generateDuplicateTitle(originalTitle));
    setSelectedType("private");
    setSelectedFriends([]);
    setCopyRatings(true);
    setRatingsExclusiveToList(true);
  };

  useEffect(() => {
    const fetchFriends = async () => {
      if (!show || selectedType === "private" || !session?.user.id) return;

      setLoadingFriends(true);
      try {
        const { data: connections, error: connError } = await supabase
          .from("friendships")
          .select("requester_id, receiver_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`);

        if (connError) throw connError;

        const friendIds = (connections || []).map((conn) =>
          conn.requester_id === session.user.id ? conn.receiver_id : conn.requester_id
        );

        if (friendIds.length === 0) {
          setFriends([]);
          return;
        }

        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", friendIds);

        if (profileError) throw profileError;
        setFriends(profiles || []);
      } catch (error) {
        console.error("Erro ao buscar amigos para duplicação:", error);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [selectedType, session?.user.id, show]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    if (selectedType !== "private" && selectedFriends.length === 0) {
      toast.error("Selecione pelo menos um amigo para listas compartilhadas.");
      return;
    }

    await onConfirm(newName, selectedType, selectedFriends, copyRatings, ratingsExclusiveToList);
  };
    
  return (
    <Modal
      show={show}
      onHide={onHide}
      onShow={handleModalShow}
      centered
      contentClassName={styles.modalContent}
    >
      <Modal.Header closeButton closeVariant="white" className={styles.header}>
        <Modal.Title className={styles.title}>
          <Copy className="me-2" size={20} />
          Duplicar Lista
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className={styles.body}>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label className={styles.label}>Novo Nome da Lista</Form.Label>
            <Form.Control
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={styles.input}
              placeholder="Ex: Minha Lista de Terror"
              required
              disabled={isProcessing}
            />
          </Form.Group>

          <Form.Label className={styles.label}>Tipo de Visibilidade</Form.Label>
          <div className={styles.typeSelector}>
            {/* Tipo: Privada */}
            <label className={`${styles.typeOption} ${selectedType === "private" ? styles.active : ""}`}>
              <input
                type="radio"
                name="listType"
                value="private"
                checked={selectedType === "private"}
                onChange={() => setSelectedType("private")}
                className="d-none"
              />
              <Lock size={18} />
              <div className={styles.typeText}>
                <strong>Particular</strong>
                <span>Ideal para grupos. Todos dão notas separadas e o sistema faz a média.</span>
              </div>
            </label>

            {/* Tipo: Partial Shared */}
            <label className={`${styles.typeOption} ${selectedType === "partial_shared" ? styles.active : ""}`}>
              <input
                type="radio"
                name="listType"
                value="partial_shared"
                checked={selectedType === "partial_shared"}
                onChange={() => setSelectedType("partial_shared")}
                className="d-none"
              />
              <Users size={18} />
              <div className={styles.typeText}>
                <strong>Colaborativa</strong>
                <span>Amigos podem ver, você edita.</span>
              </div>
            </label>

            {/* Tipo: Full Shared */}
            <label className={`${styles.typeOption} ${selectedType === "full_shared" ? styles.active : ""}`}>
              <input
                type="radio"
                name="listType"
                value="full_shared"
                checked={selectedType === "full_shared"}
                onChange={() => setSelectedType("full_shared")}
                className="d-none"
              />
              <Globe size={18} />
              <div className={styles.typeText}>
                <strong>Unificada</strong>
                <span>Uma única nota e avaliação colaborativa gerenciada por todos os membros.</span>
              </div>
            </label>
          </div>

          {selectedType !== "private" && (
            <div className="mb-4">
              <Form.Label className={styles.label}>Convide amigos</Form.Label>
              {loadingFriends ? (
                <div className="text-center py-2">
                  <Spinner size="sm" animation="border" />
                </div>
              ) : friends.length === 0 ? (
                <p className="text-muted small mb-0">Você ainda não tem amigos aceitos para convidar.</p>
              ) : (
                <div className={styles.typeSelector}>
                  {friends.map((friend) => {
                    const isSelected = selectedFriends.includes(friend.id);
                    return (
                      <label
                        key={friend.id}
                        className={`${styles.typeOption} ${isSelected ? styles.active : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFriend(friend.id)}
                          className="d-none"
                        />
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friend.username}
                            style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                          />
                        ) : (
                          <Users size={18} />
                        )}
                        <div className={styles.typeText}>
                          <strong>@{friend.username}</strong>
                        </div>
                        {isSelected && <Check size={16} />}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <Form.Check
              type="switch"
              id="copy-ratings-switch"
              className="mb-2"
              label="Duplicar também as avaliações dos filmes"
              checked={copyRatings}
              onChange={(e) => setCopyRatings(e.target.checked)}
              disabled={isProcessing}
            />
            {copyRatings && (
              <Form.Check
                type="switch"
                id="exclusive-ratings-switch"
                label="Manter avaliações exclusivas da lista duplicada"
                checked={ratingsExclusiveToList}
                onChange={(e) => setRatingsExclusiveToList(e.target.checked)}
                disabled={isProcessing || selectedType === "private"}
              />
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onHide} disabled={isProcessing}>
              Cancelar
            </button>
            <button type="submit" className={styles.confirmBtn} disabled={isProcessing || !newName.trim()}>
              {isProcessing ? <Spinner size="sm" /> : "Criar Duplicata"}
            </button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}