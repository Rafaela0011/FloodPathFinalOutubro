let tamanhoFonteAtual = 100;

function alterarTamanhoFonte(delta) {
tamanhoFonteAtual += delta * 10;
if (tamanhoFonteAtual < 80) tamanhoFonteAtual = 80;
if (tamanhoFonteAtual > 140) tamanhoFonteAtual = 140;
document.documentElement.style.fontSize = `${tamanhoFonteAtual}%`;
}

function alternarAltoContraste() {
document.body.classList.toggle('alto-contraste');
}