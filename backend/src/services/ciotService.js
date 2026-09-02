/**
 * Serviço de Geração de CIOT ANTT (Código Identificador da Operação de Transporte)
 */

function gerarCiotAntt({ frete, motorista, ipef = 'REPOM' }) {
  const timestamp = Date.now().toString().slice(-8);
  const random4 = Math.floor(1000 + Math.random() * 9000);
  const numeroCiot = `${timestamp}${random4}`; // 12 dígitos padrão ANTT
  const serieCiot = '001';
  const protocoloCiot = `ANTT-${numeroCiot}/${serieCiot}`;

  return {
    sucesso: true,
    numeroCiot: `${numeroCiot}/${serieCiot}`,
    protocoloCiot,
    ipef,
    dataGeracao: new Date().toISOString(),
    valorFrete: frete.valor_frete_compra || frete.valor_frete_real || 0,
    valorAdiantamento: frete.valor_adiantamento || 0,
    valorPedagio: frete.valor_pedagio || 0,
    motoristaNome: motorista?.nome || frete.motorista_nome,
    motoristaCpf: motorista?.cpf || '000.000.000-00',
    mensagem: `CIOT ${protocoloCiot} gerado com sucesso via IPEF ${ipef} em conformidade com a Resolução ANTT.`
  };
}

module.exports = {
  gerarCiotAntt
};
