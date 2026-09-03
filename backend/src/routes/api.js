const express = require('express');
const router = express.Router();

const { authMiddleware, requireRole } = require('../middlewares/authMiddleware');

const authController = require('../controllers/authController');
const freteController = require('../controllers/freteController');
const financeiroController = require('../controllers/financeiroController');
const importController = require('../controllers/importController');
const motoristaController = require('../controllers/motoristaController');
const clienteController = require('../controllers/clienteController');
const userController = require('../controllers/userController');
const empresaController = require('../controllers/empresaController');
const relatorioController = require('../controllers/relatorioController');
const saasController = require('../controllers/saasController');
const fiscalController = require('../controllers/fiscalController');
const mdfeController = require('../controllers/mdfeController');
const canhotoController = require('../controllers/canhotoController');
const rastreamentoController = require('../controllers/rastreamentoController');
const frotasController = require('../controllers/frotasController');
const portalClienteController = require('../controllers/portalClienteController');
const databaseExplorerController = require('../controllers/databaseExplorerController');
const calculadoraAnttService = require('../services/calculadoraAnttService');
const { consultarDistanciaRodoviaria } = require('../services/distanciaService');
const cobrancaBancariaService = require('../services/cobrancaBancariaService');
const multer = require('multer');
const uploadPfx = multer({ storage: multer.memoryStorage() });

// --- ROTAS PÚBLICAS & UTILITÁRIAS (ANTT & ROTA / DISTÂNCIA) ---
router.get('/public/canhoto/:token', canhotoController.getPublicCanhotoInfo);
router.post('/public/canhoto/:token', canhotoController.uploadPublicCanhoto);
router.get('/public/rastreio/:token', rastreamentoController.getPublicTracking);

// Calculadora Oficial ANTT
router.post('/calculadora/antt', (req, res) => {
  const result = calculadoraAnttService.calcularPisoMinimoAntt(req.body);
  return res.json(result);
});

// Consulta de Distância Rodoviária Automática (Google Maps Distance Matrix + Fallback)
router.post('/rota/distancia', async (req, res) => {
  try {
    const { origem_cidade, origem_uf, destino_cidade, destino_uf } = req.body;
    const resultado = await consultarDistanciaRodoviaria(origem_cidade, origem_uf, destino_cidade, destino_uf);
    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao calcular distância: ' + error.message, distancia_km: 650 });
  }
});

// --- AUTENTICAÇÃO ---
router.get('/auth/empresas-public', authController.getPublicEmpresas);
router.post('/auth/login', authController.login);
router.get('/auth/profile', authMiddleware, authController.getProfile);
router.put('/auth/profile', authMiddleware, authController.updateProfile);
router.put('/auth/change-password', authMiddleware, authController.changePassword);

// --- PAINEL MASTER & CONTAS A RECEBER SAAS (EXCLUSIVO SUPER_ADMIN / GHOST MASTER) ---
router.get('/saas/dashboard', authMiddleware, requireRole(['super_admin']), saasController.getSaasDashboard);
router.get('/saas/cobrancas', authMiddleware, requireRole(['super_admin']), saasController.listCobrancas);
router.put('/saas/cobrancas/:id', authMiddleware, requireRole(['super_admin']), saasController.atualizarStatusCobranca);
router.post('/saas/cobrancas', authMiddleware, requireRole(['super_admin']), saasController.createCobrancaAvulsa);
router.delete('/saas/cobrancas/:id', authMiddleware, requireRole(['super_admin']), saasController.deleteCobranca);
router.post('/saas/gerar-mensalidades', authMiddleware, requireRole(['super_admin']), saasController.gerarMensalidadesMes);
router.post('/saas/empresas/:id/renovar-teste', authMiddleware, requireRole(['super_admin']), saasController.renovarPeriodoTeste);
router.put('/saas/empresas/:id/tipo-licenca', authMiddleware, requireRole(['super_admin']), saasController.alterarTipoLicenca);

// --- FRETES & SUBCONTRATAÇÃO ---
router.get('/fretes', authMiddleware, freteController.listFretes);
router.get('/fretes/:id', authMiddleware, freteController.getFreteById);
router.post('/fretes', authMiddleware, freteController.createFrete);
router.put('/fretes/:id', authMiddleware, freteController.updateFrete);
router.delete('/fretes/:id', authMiddleware, requireRole(['admin']), freteController.deleteFrete);

// --- FINANCEIRO & ADIANTAMENTOS ---
router.get('/financeiro/kpis', authMiddleware, financeiroController.getDashboardKPIs);
router.get('/financeiro/plano-contas', authMiddleware, financeiroController.getPlanoContas);
router.get('/financeiro/titulos', authMiddleware, financeiroController.listTitulos);
router.post('/financeiro/titulos', authMiddleware, financeiroController.createTitulo);
router.put('/financeiro/titulos/:id', authMiddleware, financeiroController.updateTitulo);
router.post('/financeiro/titulos/:id/baixar', authMiddleware, financeiroController.baixarTitulo);
router.delete('/financeiro/baixas/:id', authMiddleware, requireRole(['admin', 'super_admin']), financeiroController.deleteBaixa);
router.delete('/financeiro/titulos/:id', authMiddleware, requireRole(['admin', 'super_admin']), financeiroController.deleteTitulo);
router.get('/financeiro/contas-pagar', authMiddleware, financeiroController.listContasPagar);
router.get('/financeiro/contas-receber', authMiddleware, financeiroController.listContasReceber);
router.post('/financeiro/pagamentos', authMiddleware, financeiroController.lancarPagamentoMotorista);
router.put('/financeiro/recebimento/:id', authMiddleware, financeiroController.atualizarStatusRecebimento);

// --- RELATÓRIOS GERENCIAIS, FISCAIS & EXTRATOS ---
router.get('/relatorios/motoristas', authMiddleware, relatorioController.getRelatorioMotoristas);
router.get('/relatorios/motorista-extrato', authMiddleware, relatorioController.getExtratoMotorista);
router.get('/relatorios/clientes', authMiddleware, relatorioController.getRelatorioClientes);
router.get('/relatorios/financeiro', authMiddleware, relatorioController.getRelatorioFinanceiro);
router.get('/relatorios/financeiro-fluxo', authMiddleware, relatorioController.getRelatorioFinanceiroFluxo);
router.get('/relatorios/repasses-comissoes', authMiddleware, relatorioController.getRelatorioRepassesComissoes);
router.get('/relatorios/dre-operacional', authMiddleware, relatorioController.getRelatorioDreOperacional);
router.get('/relatorios/canhotos-pod', authMiddleware, relatorioController.getRelatorioCanhotosPod);
router.get('/relatorios/manutencao-frota', authMiddleware, relatorioController.getRelatorioManutencaoFrota);
router.get('/relatorios/contas-pagas', authMiddleware, relatorioController.getRelatorioContasPagas);
router.get('/relatorios/resumo-simplificado', authMiddleware, relatorioController.getRelatorioResumoSimplificado);


// --- IMPORTAÇÃO CT-E (XML / DACTE) ---
router.post('/import/xml-file', authMiddleware, importController.upload.single('xml'), importController.parseXmlFile);
router.post('/import/xml-text', authMiddleware, importController.parseXmlText);
router.post('/import/dacte-text', authMiddleware, importController.parseDacteText);

// --- EMISSÃO FISCAL SEFAZ CT-E 4.00 & CERTIFICADO A1 ---
router.get('/fiscal/config', authMiddleware, fiscalController.getFiscalConfig);
router.put('/fiscal/config', authMiddleware, requireRole(['admin', 'super_admin']), uploadPfx.single('certificado'), fiscalController.updateFiscalConfig);
router.post('/fiscal/test-sefaz', authMiddleware, fiscalController.testarStatusSefaz);
router.post('/fiscal/emitir/:freteId', authMiddleware, requireRole(['admin', 'operador', 'operador_financeiro', 'super_admin']), fiscalController.emitirCte);
router.post('/fiscal/cancelar/:freteId', authMiddleware, requireRole(['admin', 'operador', 'operador_financeiro', 'super_admin']), fiscalController.cancelarCte);
router.post('/fiscal/cce/:freteId', authMiddleware, requireRole(['admin', 'operador', 'operador_financeiro', 'super_admin']), fiscalController.cartaCorrecaoCte);
router.get('/fiscal/dacte/:freteId', authMiddleware, fiscalController.getDacte);
router.get('/fiscal/xml/:freteId', authMiddleware, fiscalController.downloadXml);

// --- EMISSÃO FISCAL SEFAZ MDF-E 3.00 & DAMDFE ---
router.get('/mdfe', authMiddleware, mdfeController.listMdfes);
router.post('/mdfe', authMiddleware, requireRole(['admin', 'operador', 'operador_financeiro', 'super_admin']), mdfeController.createMdfe);
router.post('/mdfe/emitir/:id', authMiddleware, requireRole(['admin', 'operador', 'operador_financeiro', 'super_admin']), mdfeController.emitirMdfe);
router.post('/mdfe/encerrar/:id', authMiddleware, requireRole(['admin', 'operador', 'operador_financeiro', 'super_admin']), mdfeController.encerrarMdfe);
router.post('/mdfe/cancelar/:id', authMiddleware, requireRole(['admin', 'operador', 'operador_financeiro', 'super_admin']), mdfeController.cancelarMdfe);
router.get('/mdfe/damdfe/:id', authMiddleware, mdfeController.getDamdfeData);

// --- CANHOTO DIGITAL POD (COMPROVANTE DE ENTREGA) ---
router.post('/fretes/:id/canhoto-auditar', authMiddleware, requireRole(['admin', 'operador', 'operador_financeiro', 'super_admin']), canhotoController.auditarCanhoto);
router.get('/fretes/:id/canhoto-token', authMiddleware, canhotoController.gerarTokenCanhoto);

// --- TORRE DE CONTROLE & RASTREAMENTO DE VIAGENS ---
router.get('/torre-controle', authMiddleware, rastreamentoController.getTorreControle);
router.post('/torre-controle/mover', authMiddleware, rastreamentoController.moverStatusViagem);
router.post('/fretes/:id/rastreamento', authMiddleware, rastreamentoController.addEventoRastreamento);
router.get('/fretes/:id/rastreamento-token', authMiddleware, rastreamentoController.gerarTokenRastreamento);

// --- GESTÃO DE FROTAS & MANUTENÇÃO PREVENTIVA ---
router.get('/frotas/manutencoes', authMiddleware, frotasController.listManutencoes);
router.post('/frotas/manutencoes', authMiddleware, requireRole(['admin', 'operador', 'operador_financeiro', 'super_admin']), frotasController.createManutencao);
router.get('/frotas/pneus', authMiddleware, frotasController.listPneus);
router.post('/frotas/pneus', authMiddleware, requireRole(['admin', 'operador', 'operador_financeiro', 'super_admin']), frotasController.createOrUpdatePneu);

// --- COBRANÇAS BANCÁRIAS FEBRABAN & PIX ---
router.post('/financeiro/boletos/gerar', authMiddleware, (req, res) => {
  const result = cobrancaBancariaService.gerarLinhaDigitavelEBoleto(req.body);
  return res.json(result);
});

// --- PORTAL DO EMBARCADOR / CLIENTE ---
router.get('/portal-cliente/fretes', authMiddleware, portalClienteController.getPortalFretes);

// --- MOTORISTAS / FRETEIROS ---
router.get('/motoristas', authMiddleware, motoristaController.listMotoristas);
router.get('/motoristas/:id', authMiddleware, motoristaController.getMotoristaById);
router.post('/motoristas', authMiddleware, motoristaController.createMotorista);
router.put('/motoristas/:id', authMiddleware, motoristaController.updateMotorista);
router.delete('/motoristas/:id', authMiddleware, requireRole(['admin', 'super_admin']), motoristaController.deleteMotorista);

// --- CLIENTES / EMBARCADORES ---
router.get('/clientes', authMiddleware, clienteController.listClientes);
router.get('/clientes/:id', authMiddleware, clienteController.getClienteById);
router.post('/clientes', authMiddleware, clienteController.createCliente);
router.put('/clientes/:id', authMiddleware, clienteController.updateCliente);
router.delete('/clientes/:id', authMiddleware, requireRole(['admin', 'super_admin']), clienteController.deleteCliente);

router.get('/empresa', authMiddleware, empresaController.getEmpresaConfig);
router.put('/empresa', authMiddleware, requireRole(['admin', 'super_admin']), empresaController.updateEmpresaConfig);
router.get('/config/database-stats', authMiddleware, requireRole(['admin', 'super_admin']), empresaController.getDatabaseStats);
router.post('/config/reset-database', authMiddleware, requireRole(['admin', 'super_admin']), empresaController.resetDatabase);

// --- GESTÃO GLOBAL DE LICENÇAS / EMPRESAS (RESTRITO AO SUPER_ADMIN / GHOST MASTER) ---
router.get('/empresas', authMiddleware, requireRole(['super_admin']), empresaController.listEmpresas);
router.get('/empresas/:id', authMiddleware, requireRole(['super_admin']), empresaController.getEmpresaById);
router.post('/empresas', authMiddleware, requireRole(['super_admin']), empresaController.createEmpresa);
router.put('/empresas/:id', authMiddleware, requireRole(['super_admin']), empresaController.updateEmpresa);
router.delete('/empresas/:id', authMiddleware, requireRole(['super_admin']), empresaController.deleteEmpresa);

// --- GESTÃO DE USUÁRIOS & PERMISSÕES ---
router.get('/users', authMiddleware, requireRole(['admin', 'super_admin']), userController.listUsers);
router.post('/users', authMiddleware, requireRole(['admin', 'super_admin']), userController.createUser);
router.put('/users/:id', authMiddleware, requireRole(['admin', 'super_admin']), userController.updateUser);
router.delete('/users/:id', authMiddleware, requireRole(['admin', 'super_admin']), userController.deleteUser);

// --- GESTÃO & VISUALIZAÇÃO DE BANCO DE DADOS (DATABASE EXPLORER) - EXCLUSIVO SUPER_ADMIN ---
router.get('/saas/database/summary', authMiddleware, requireRole(['super_admin']), databaseExplorerController.getTableSummary);
router.get('/saas/database/table-data', authMiddleware, requireRole(['super_admin']), databaseExplorerController.getTableData);
router.post('/saas/database/record', authMiddleware, requireRole(['super_admin']), databaseExplorerController.insertRecord);
router.put('/saas/database/record', authMiddleware, requireRole(['super_admin']), databaseExplorerController.updateRecord);
router.delete('/saas/database/record', authMiddleware, requireRole(['super_admin']), databaseExplorerController.deleteRecord);
router.post('/saas/database/purge-licenca', authMiddleware, requireRole(['super_admin']), databaseExplorerController.purgeLicenca);
router.get('/saas/database/download-backup', authMiddleware, requireRole(['super_admin']), databaseExplorerController.downloadBackup);

module.exports = router;
