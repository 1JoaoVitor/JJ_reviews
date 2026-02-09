import {
   Navbar,
   Container,
   ButtonGroup,
   Button,
   Form,
   InputGroup,
} from "react-bootstrap";

interface AppNavbarProps {
   onlyNational: boolean;
   setOnlyNational: (val: boolean) => void;
   onlyOscar: boolean;
   setOnlyOscar: (val: boolean) => void;
   sortOrder: string;
   setSortOrder: (val: string) => void;
   searchTerm: string;
   setSearchTerm: (val: string) => void;
   availableGenres: string[];
   selectedGenre: string;
   setSelectedGenre: (val: string) => void;
   onStartBattle: () => void;
}

export function AppNavbar({
   onlyNational,
   setOnlyNational,
   onlyOscar,
   setOnlyOscar,
   sortOrder,
   setSortOrder,
   searchTerm,
   setSearchTerm,
   availableGenres,
   selectedGenre,
   setSelectedGenre,
   onStartBattle,
}: AppNavbarProps) {
   return (
      <Navbar
         bg="dark"
         variant="dark"
         expand="lg"
         sticky="top"
         className="mb-4 shadow-sm px-3"
      >
         <Container fluid>
            <Navbar.Brand
               href="#"
               className="fw-bold fs-3 d-flex align-items-center"
            >
               {/* Círculo Amarelo com JJ dentro */}
               <div
                  className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center me-2"
                  style={{
                     width: "40px",
                     height: "40px",
                     fontSize: "0.8em",
                     fontWeight: "900",
                  }}
               >
                  JJ
               </div>
               <span>Reviews</span>
            </Navbar.Brand>

            <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-3 w-100 justify-content-end mt-3 mt-md-0">
               <div className="d-flex gap-2 w-100 justify-content-between justify-content-md-end">
                  {/* BOTÃO BATALHA  */}
                  <Button
                     variant="dark"
                     className="me-3 fw-bold d-none d-md-block" // Escondido no mobile p/ não quebrar layout agora
                     onClick={onStartBattle}
                  >
                     ⚔️ Batalha
                  </Button>

                  <ButtonGroup className="d-none d-md-flex">
                     <Button
                        variant={
                           !onlyNational && !onlyOscar
                              ? "secondary"
                              : "outline-secondary"
                        }
                        onClick={() => {
                           setOnlyNational(false);
                           setOnlyOscar(false);
                        }}
                        className="fw-bold"
                     >
                        Todos
                     </Button>
                     <Button
                        variant={onlyNational ? "success" : "outline-success"}
                        onClick={() => setOnlyNational(!onlyNational)}
                        className="fw-bold"
                     >
                        Nacionais
                     </Button>
                     {/* Botão*/}
                     <Button
                        variant={onlyOscar ? "warning" : "outline-warning"}
                        onClick={() => {
                           setOnlyOscar(!onlyOscar);
                           // setOnlyNational(false);
                        }}
                        className="btn-outline-oscar"
                        style={{ position: "relative" }}
                     >
                        Oscar
                        {onlyOscar && (
                           <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                              <span className="visually-hidden">
                                 Filtro ativo
                              </span>
                           </span>
                        )}
                     </Button>
                  </ButtonGroup>

                  {/* Dropdowns */}
                  <div className="d-flex gap-2 flex-grow-1 flex-md-grow-0">
                     {/* Dropdown de Gêneros*/}
                     <Form.Select
                        className="bg-dark text-white border-secondary"
                        style={{ cursor: "pointer" }}
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                     >
                        <option value="">Todos</option>
                        {availableGenres.map((genre) => (
                           <option key={genre} value={genre}>
                              {genre}
                           </option>
                        ))}
                     </Form.Select>

                     <Form.Select
                        aria-label="Ordenar por"
                        className="bg-dark text-white border-secondary"
                        style={{ maxWidth: "180px", cursor: "pointer" }}
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                     >
                        <option value="default">Recentes</option>
                        <option value="rating">Melhores Notas</option>
                        <option value="date">Lançamento</option>
                        <option value="alpha">Ordem A-Z</option>
                     </Form.Select>
                  </div>
               </div>

               <Form
                  className="d-flex custom-search-bar"
                  onSubmit={(e) => e.preventDefault()}
               >
                  <InputGroup>
                     <InputGroup.Text id="search-icon">🔍</InputGroup.Text>
                     <Form.Control
                        type="search"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                     />
                  </InputGroup>
               </Form>
            </div>
         </Container>
      </Navbar>
   );
}
