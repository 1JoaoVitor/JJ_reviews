import { Bookmark, Users, Layers, ListPlus } from "lucide-react";
import type { CustomList } from "@/types";
import styles from "./ListsView.module.css"; 

interface ListsViewProps {
   lists: CustomList[];
   listsLoading: boolean;
   onSelectList: (list: CustomList) => void;
   onCreateListClick: () => void;
}

export function ListsView({ lists, listsLoading, onSelectList, onCreateListClick }: ListsViewProps) {
   const privateLists = lists.filter(l => l.type === "private" || !l.type);
   const partialSharedLists = lists.filter(l => l.type === "partial_shared");
   const fullSharedLists = lists.filter(l => l.type === "full_shared");

   const renderListGroup = (title: string, groupLists: CustomList[], icon: React.ReactNode) => {
      if (groupLists.length === 0) return null;
      
      return (
         <div className="mb-5">
            <h5 className={`mb-3 d-flex align-items-center gap-2 ${styles.groupTitle}`}>
               {icon} {title}
            </h5>
            <div className="row g-3">
               {groupLists.map((list) => (
                  <div key={list.id} className="col-12 col-md-6 col-lg-4">
                     <div 
                        className={styles.listCard}
                        onClick={() => onSelectList(list)}
                     >
                        <h5 className={styles.listTitle}>{list.name}</h5>
                        <p className={`text-muted small mb-0 ${styles.listDescription}`}>
                           {list.description || "Sem descrição"}
                        </p>
                        <p className={`text-muted small mb-0 mt-2 ${styles.listCount}`}>
                           {(list.movie_count ?? 0) === 1 ? "1 filme" : `${list.movie_count ?? 0} filmes`}
                        </p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      );
   };

   return (
      <div className={styles.listsContainer}>
         <div className="d-flex justify-content-between align-items-center mb-5 mt-3">
            <h4 className="m-0 text-white fw-bold">Minhas Listas</h4>
            <button onClick={onCreateListClick} className={styles.createListBtn}>
               <ListPlus size={18} className="me-2" /> Nova Lista
            </button>
         </div>

         {listsLoading ? (
            <div className="text-center py-5 text-muted">Carregando listas...</div>
         ) : lists.length === 0 ? (
            <div className="text-center py-5 text-muted">Você ainda não participa de nenhuma lista. Que tal começar agora?</div>
         ) : (
            <div>
               {renderListGroup("Listas Particulares", privateLists, <Bookmark size={18} />)}
               {renderListGroup("Listas Colaborativas", partialSharedLists, <Users size={18} />)}
               {renderListGroup("Listas Unificadas", fullSharedLists, <Layers size={18} />)}
            </div>
         )}
      </div>
   );
}