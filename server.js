const express = require('express');
const path = require('path');

const app = express();

// Define a porta do servidor (essencial para o Render)
const PORT = process.env.PORT || 3000;

// Serve todos os ficheiros estáticos da raiz do projeto (index.html, style.css, JS, etc.)
app.use(express.static(path.join(__dirname)));

// Rota principal para garantir que o index.html é servido
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor da Honey IA a correr na porta ${PORT}`);
});

