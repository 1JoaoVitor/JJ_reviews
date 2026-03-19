import { Dropdown, Spinner } from "react-bootstrap";
import { Bell, UserPlus, List, Film, Check } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import styles from "./NotificationBell.module.css";

interface NotificationBellProps {
   userId?: string;
}

function timeAgo(dateString: string) {
   const date = new Date(dateString);
   const now = new Date();
   const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

   if (diffInSeconds < 60) return "Agora mesmo";
   if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
   if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`;
   return `${Math.floor(diffInSeconds / 86400)} d atrás`;
}

export function NotificationBell({ userId }: NotificationBellProps) {
   const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(userId);
   const navigate = useNavigate();

   if (!userId) return null;

   const getNotificationIcon = (type: string) => {
      switch (type) {
         case "friend_request": return <UserPlus size={20} />;
         case "list_invite": return <List size={20} />;
         case "movie_added": return <Film size={20} />;
         default: return <Bell size={20} />;
      }
   };

   // ─── FUNÇÃO DE NAVEGAÇÃO INTELIGENTE ───
   const handleNotificationClick = (notif: { id: string; is_read: boolean; type: string; reference_id?: string; sender?: { username?: string } }) => {
      if (!notif.is_read) markAsRead(notif.id);
      
      // Redireciona dependendo do tipo da notificação USANDO A URL DIRETAMENTE
      if (notif.type === "list_invite") {
         if (notif.reference_id) {
            window.location.assign(`/?aba=lists&listId=${notif.reference_id}`);
         } else {
            navigate(`/?aba=lists`);
         }
      } else if (notif.type === "movie_added") {
         navigate(`/?aba=lists`);
      } else if (notif.type === "friend_request") {
         if (notif.sender?.username) {
            navigate(`/perfil/${notif.sender.username}`);
         }
      }
   };

   return (
      <Dropdown align="end" className={styles.bellWrapper}>
         <Dropdown.Toggle as="button" className={styles.bellBtn} id="dropdown-notifications">
            <Bell size={20} />
            {unreadCount > 0 && (
               <div className={styles.badge}>
                  {unreadCount > 9 ? "9+" : unreadCount}
               </div>
            )}
         </Dropdown.Toggle>

         <Dropdown.Menu className={styles.dropdownMenu}>
            <div className={styles.header}>
               <h3 className={styles.title}>Notificações</h3>
               {unreadCount > 0 && (
                  <button className={styles.markAllBtn} onClick={markAllAsRead}>
                     <Check size={14} className="me-1" />
                     Ler todas
                  </button>
               )}
            </div>

            {loading && notifications.length === 0 ? (
               <div className="text-center py-4">
                  <Spinner size="sm" animation="border" variant="light" />
               </div>
            ) : notifications.length === 0 ? (
               <div className={styles.emptyState}>
                  <Bell size={32} className={styles.emptyIcon} />
                  <p>Você não tem novas notificações.</p>
               </div>
            ) : (
               notifications.map((notif) => (
                  <div 
                     key={notif.id} 
                     className={`${styles.notificationItem} ${!notif.is_read ? styles.unread : ""}`}
                     onClick={() => handleNotificationClick(notif)}
                  >
                     {notif.sender?.avatar_url ? (
                        <img src={notif.sender.avatar_url} alt="Avatar" className={styles.avatar} />
                     ) : (
                        <div className={styles.iconPlaceholder}>
                           {getNotificationIcon(notif.type)}
                        </div>
                     )}
                     
                     <div className={styles.content}>
                        <p className={styles.message}>
                            {notif.sender?.username ? (
                                <><strong>@{notif.sender.username}</strong> {notif.message}</>
                            ) : (
                                notif.message
                            )}
                        </p>
                        <p className={styles.time}>{timeAgo(notif.created_at)}</p>
                     </div>

                     {!notif.is_read && <div className={styles.unreadDot} />}
                  </div>
               ))
            )}
         </Dropdown.Menu>
      </Dropdown>
   );
}