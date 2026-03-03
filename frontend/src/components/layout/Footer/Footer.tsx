import { Container } from "react-bootstrap";

export function Footer() {
   return (
      <footer className="text-center py-4 mt-5 bg-white border-top">
         <Container>
            <div className="mb-2 text-muted small">
               Desenvolvido por <strong>João Vitor E. Souza</strong>
            </div>
            <div className="mb-3">
               <a
                  href="https://github.com/1JoaoVitor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none text-secondary me-3"
               >
                  <i className="bi bi-github"></i> GitHub
               </a>
               <a
                  href="https://www.linkedin.com/in/joão-vitor-evangelista-de-souza-a0954526b"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none text-secondary"
               >
                  LinkedIn
               </a>
            </div>
         </Container>
      </footer>
   );
}
