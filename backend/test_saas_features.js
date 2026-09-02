const db = require('./src/config/database');
const request = require('http');
const express = require('express');
const app = require('./src/server');

// We can test directly using the API endpoints or controllers
const authController = require('./src/controllers/authController');
const userController = require('./src/controllers/userController');
const saasController = require('./src/controllers/saasController');
const empresaController = require('./src/controllers/empresaController');

async function runTests() {
  console.log('==============================================');
  console.log('🧪 INICIANDO TESTES DO SAAS MASTER & LICENÇAS');
  console.log('==============================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASSOU] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FALHOU] ${testName}`);
      failed++;
    }
  }

  // TESTE 1: Verificar que super_admin tem empresa_id = null no banco
  const ghost = db.prepare("SELECT * FROM users WHERE email = 'ghost@sisfrete.com'").get();
  assert(ghost && ghost.role === 'super_admin' && ghost.empresa_id === null, '1. Super Admin ghost@sisfrete.com tem empresa_id = NULL no banco');

  // TESTE 2: Simular listUsers para admin comum da Licença 1
  const reqAdmin1 = {
    user: { id: 2, role: 'admin', empresa_id: 1 },
    empresaId: 1,
  };
  let admin1UsersResult = null;
  const resAdmin1 = {
    json: (data) => { admin1UsersResult = data; },
    status: () => resAdmin1,
  };
  userController.listUsers(reqAdmin1, resAdmin1);
  const ghostInAdmin1 = admin1UsersResult?.some(u => u.email === 'ghost@sisfrete.com' || u.role === 'super_admin');
  assert(ghostInAdmin1 === false, '2. Administrador da Licença 1 NUNCA visualiza o super_admin');

  // TESTE 3: Administrador comum tentando alterar senha do super admin deve ser bloqueado com 403
  let updateStatus = 200;
  let updateErrorMsg = '';
  const resBlock = {
    status: (code) => { updateStatus = code; return resBlock; },
    json: (data) => { updateErrorMsg = data.error || ''; },
  };
  const reqUpdateGhost = {
    user: { id: 2, role: 'admin', empresa_id: 1 },
    params: { id: ghost.id },
    body: { password: 'hacked_password123' },
  };
  userController.updateUser(reqUpdateGhost, resBlock);
  assert(updateStatus === 403, `3. Bloqueio 403 ao admin comum tentar alterar senha do super_admin (Status: ${updateStatus})`);

  // TESTE 4: Sincronização e Dashboard do SaaS Master
  let dashboardResult = null;
  const reqSuper = {
    user: { id: ghost.id, role: 'super_admin', empresa_id: null },
  };
  const resSuper = {
    json: (data) => { dashboardResult = data; },
    status: () => resSuper,
  };
  saasController.getSaasDashboard(reqSuper, resSuper);
  assert(dashboardResult && dashboardResult.total_licencas >= 2, `4. Dashboard SaaS retorna métricas com ${dashboardResult?.total_licencas} licenças`);
  assert(dashboardResult && dashboardResult.mrr_projetado >= 700, `5. MRR Projetado correto (R$ ${dashboardResult?.mrr_projetado})`);

  // TESTE 5: Listagem de Cobranças do Mês com vencimento dia 10
  let cobrancasResult = null;
  const resCobrancas = {
    json: (data) => { cobrancasResult = data; },
    status: () => resCobrancas,
  };
  saasController.listCobrancas({ query: { mes_referencia: dashboardResult.mes_referencia_atual } }, resCobrancas);
  assert(cobrancasResult && cobrancasResult.length >= 2, `6. Cobranças do mês geradas para as licenças (Total: ${cobrancasResult?.length})`);
  const todasDia10e350 = cobrancasResult?.every(c => c.valor === 350.00 && c.data_vencimento.endsWith('-10'));
  assert(todasDia10e350, '7. Todas as mensalidades geradas têm valor R$ 350,00 e vencimento no dia 10');

  // TESTE 6: Registrar Baixa de Pagamento em uma fatura
  const primeiraFatura = cobrancasResult[0];
  let baixaResult = null;
  const resBaixa = {
    json: (data) => { baixaResult = data; },
    status: () => resBaixa,
  };
  saasController.atualizarStatusCobranca({
    params: { id: primeiraFatura.id },
    body: {
      status: 'pago',
      forma_pagamento: 'PIX',
      comprovante_ref: 'PIX-E2E-TESTE-998811',
      observacoes: 'Mensalidade paga pontualmente',
    }
  }, resBaixa);
  assert(baixaResult && baixaResult.cobranca.status === 'pago', '8. Baixa de mensalidade registrada com sucesso como PAGA via PIX');

  // TESTE 7: Criar nova empresa/licença com 1º admin e verificar geração automática da mensalidade
  const codigoNovaLic = '999';
  // Limpar teste anterior se existir
  db.prepare("DELETE FROM empresas WHERE codigo_licenca = '999'").run();

  let novaEmpresaResult = null;
  const resNovaEmp = {
    status: (code) => resNovaEmp,
    json: (data) => { novaEmpresaResult = data; },
  };
  empresaController.createEmpresa({
    body: {
      codigo_licenca: codigoNovaLic,
      razao_social: 'TRANSPORTES ESTRELA DO SUL LTDA',
      nome_fantasia: 'Estrela do Sul Log',
      cnpj: '99.888.777/0001-11',
      cidade: 'Porto Alegre',
      uf: 'RS',
      limite_logins: 8,
      valor_mensalidade: 350.00,
      dia_vencimento: 10,
      admin_name: 'Gerente Estrela',
      admin_email: 'admin@estreladosul.com',
      admin_password: 'senhaestrela123',
    }
  }, resNovaEmp);

  assert(novaEmpresaResult && novaEmpresaResult.empresa && novaEmpresaResult.empresa.codigo_licenca === '999', '9. Nova Licença #999 criada com sucesso');
  
  // Verificar se o admin da nova licença foi criado
  const adminEstrela = db.prepare("SELECT * FROM users WHERE email = 'admin@estreladosul.com'").get();
  assert(adminEstrela && adminEstrela.role === 'admin' && adminEstrela.empresa_id === novaEmpresaResult.empresa.id, '10. Usuário Administrador da nova Licença criado com vínculo correto');

  // Verificar se a cobrança do mês corrente para a nova licença foi criada automaticamente
  const cobrancaEstrela = db.prepare("SELECT * FROM licencas_cobrancas WHERE empresa_id = ?").get(novaEmpresaResult.empresa.id);
  assert(cobrancaEstrela && cobrancaEstrela.valor === 350.00 && cobrancaEstrela.data_vencimento.endsWith('-10'), '11. Cobrança de R$ 350 com vencimento dia 10 gerada AUTOMATICAMENTE para a nova licença');

  // Limpeza do teste
  db.prepare("DELETE FROM licencas_cobrancas WHERE empresa_id = ?").run(novaEmpresaResult.empresa.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(adminEstrela.id);
  db.prepare("DELETE FROM empresas WHERE id = ?").run(novaEmpresaResult.empresa.id);

  console.log('\n==============================================');
  console.log(`📊 RESULTADO FINAL: ${passed} PASSOU / ${failed} FALHOU`);
  console.log('==============================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
