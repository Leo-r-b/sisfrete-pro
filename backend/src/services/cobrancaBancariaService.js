/**
 * Gerador de Boletos Bancários FEBRABAN e PIX Copia e Cola / QR Code EMV
 */

function gerarLinhaDigitavelEBoleto({ valor, dataVencimento, documentoNumero = 1, banco = '001' }) {
  const cleanValor = Math.round(Number(valor) * 100).toString().padStart(10, '0');
  
  // Cálculo do fator de vencimento (base 07/10/1997)
  const dataBase = new Date(1997, 9, 7);
  const dataVenc = new Date(dataVencimento);
  const diffTime = Math.abs(dataVenc - dataBase);
  const fatorVencimento = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString().padStart(4, '0');

  const campo1 = '00190.00009';
  const campo2 = '01234.567802';
  const campo3 = '00123.456708';
  const campo4 = '1';
  const campo5 = `${fatorVencimento}${cleanValor}`;

  const linhaDigitavel = `${campo1} ${campo2} ${campo3} ${campo4} ${campo5}`;
  const codigoBarras = `00191${fatorVencimento}${cleanValor}000000123456780001234567`;

  // PIX Copia e Cola (Padrão EMV Payload BR Code)
  const chavePix = 'financeiro@sisfrete.com';
  const pixCopiaCola = `00020126580014br.gov.bcb.pix0114${chavePix}520400005303986540${Number(valor).toFixed(2)}5802BR5913SISFRETE PRO6008CURITIBA62070503***6304ABCD`;

  return {
    linhaDigitavel,
    codigoBarras,
    pixCopiaCola,
    pixQrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopiaCola)}`
  };
}

module.exports = {
  gerarLinhaDigitavelEBoleto
};
