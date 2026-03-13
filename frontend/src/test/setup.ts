import '@testing-library/jest-dom';

// No futuro, se alguma biblioteca de UI reclamar que falta algo no ambiente de teste
// (como o ResizeObserver ou window.matchMedia), é neste arquivo que colocaremos os "mocks" globais.
// Por enquanto, apenas importar o jest-dom já é o suficiente!