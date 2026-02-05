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
   sortOrder: string;
   setSortOrder: (val: string) => void;
   searchTerm: string;
   setSearchTerm: (val: string) => void;
}

export function AppNavbar({
   onlyNational,
   setOnlyNational,
   sortOrder,
   setSortOrder,
   searchTerm,
   setSearchTerm,
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
            <Navbar.Brand href="#" className="fw-bold fs-3">
               JJ Reviews
            </Navbar.Brand>

            <div className="d-flex align-items-center gap-3 w-100 justify-content-end">
               <ButtonGroup className="d-none d-md-flex">
                  <Button
                     variant={!onlyNational ? "secondary" : "outline-secondary"}
                     onClick={() => setOnlyNational(false)}
                     className="fw-bold"
                  >
                     Todos
                  </Button>
                  <Button
                     variant={onlyNational ? "success" : "outline-success"}
                     onClick={() => setOnlyNational(true)}
                     className="fw-bold"
                  >
                     Nacionais
                  </Button>
               </ButtonGroup>

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

               <Form
                  className="d-flex"
                  style={{ maxWidth: "300px", width: "100%" }}
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
