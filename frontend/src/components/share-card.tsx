import { forwardRef } from "react";
import type { MovieData } from "../types";
import { getBadgeStyle } from "../utils";

interface ShareCardProps {
   movie: MovieData;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
   ({ movie }, ref) => {
      const badgeStyle = getBadgeStyle(movie.recommended);

      const posterUrl = movie.poster_path
         ? `https://image.tmdb.org/t/p/w780${movie.poster_path}?v=1`
         : "https://via.placeholder.com/500x750?text=Sem+Imagem";

      return (
         <div
            ref={ref}
            style={{
               position: "fixed",
               top: "-9999px",
               left: "-9999px",
               width: "1080px",
               height: "1920px",
               backgroundColor: "#111",
               fontFamily: "sans-serif",
               zIndex: -1,
               overflow: "hidden",
               display: "flex",
               flexDirection: "column",
            }}
         >
            {/* Fundo */}
            <div
               style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundImage: `url(${posterUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(30px)",
                  zIndex: 0,
               }}
            />

            {/* Máscara Preta */}
            <div
               style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "rgba(0,0,0,0.85)",
                  zIndex: 1,
               }}
            />

            {/* Conteúdo Real */}
            <div
               style={{
                  position: "relative",
                  zIndex: 10,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  padding: "80px 40px",
                  color: "white",
                  boxSizing: "border-box",
               }}
            >
               {/* --- TOPO --- */}
               <div
                  style={{
                     display: "flex",
                     flexDirection: "column",
                     alignItems: "center",
                     width: "100%",
                     marginBottom: "100px",
                  }}
               >
                  <h2
                     style={{
                        fontSize: "35px",
                        fontStyle: "italic",
                        fontWeight: "bold",
                        color: "#ffc107",
                        letterSpacing: "4px",
                        marginBottom: "60px",
                        textTransform: "uppercase",
                     }}
                  >
                     JJ REVIEWS
                  </h2>

                  <img
                     src={posterUrl}
                     alt={movie.title}
                     crossOrigin="anonymous"
                     style={{
                        width: "480px",
                        height: "auto",
                        borderRadius: "20px",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
                        border: "2px solid rgba(255,255,255,0.1)",
                     }}
                  />
               </div>

               {/* --- MEIO --- */}
               <div
                  style={{
                     display: "flex",
                     flexDirection: "column",
                     alignItems: "center",
                     width: "100%",
                  }}
               >
                  <h1
                     style={{
                        fontSize: "75px",
                        textAlign: "center",
                        fontWeight: "900",
                        marginBottom: "20px",
                        lineHeight: "1.1",
                        textShadow: "0 4px 10px rgba(0,0,0,1)",
                        maxWidth: "95%",
                        color: "#ffffff",
                     }}
                  >
                     {movie.title}
                  </h1>

                  <p
                     style={{
                        fontSize: "32px",
                        color: "#dddddd",
                        marginBottom: "50px",
                        fontWeight: "500",
                     }}
                  >
                     {movie.release_date?.split("-")[0]}{" "}
                     {movie.director && `• ${movie.director}`}
                  </p>

                  {/* NOTA */}
                  {movie.rating !== null && (
                     <div
                        style={{
                           display: "flex",
                           alignItems: "center",
                           gap: "20px",
                           backgroundColor: "rgba(0,0,0,0.8)",
                           padding: "10px 40px",
                           borderRadius: "20px",
                           border: "2px solid #ffc107",
                           marginBottom: "50px",
                           boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                        }}
                     >
                        <span style={{ fontSize: "60px" }}>⭐</span>
                        <span
                           style={{
                              fontSize: "80px",
                              fontWeight: "bold",
                              color: "#fff",
                           }}
                        >
                           {movie.rating}
                        </span>
                     </div>
                  )}

                  {/* VEREDITO */}
                  {movie.recommended && (
                     <div
                        style={{
                           fontSize: "40px",
                           fontStyle: "italic",
                           textAlign: "center",
                           backgroundColor: badgeStyle.bg,
                           color: badgeStyle.color,
                           padding: "20px 60px",
                           borderRadius: "15px",
                           fontWeight: "bold",
                           maxWidth: "90%",
                           textTransform: "uppercase",
                           border: "none",
                           boxShadow: "none",
                           letterSpacing: "1px",
                        }}
                     >
                        {movie.recommended}
                     </div>
                  )}
               </div>

               {/* --- RODAPÉ --- */}
               <div
                  style={{
                     marginTop: "auto",
                     fontSize: "24px",
                     color: "rgba(255,255,255,0.6)",
                     fontWeight: "500",
                  }}
               >
                  https://jj-reviews.vercel.app
               </div>
            </div>
         </div>
      );
   },
);

ShareCard.displayName = "ShareCard";
