// Google Apps Script para integração com a planilha
// Este código deve ser copiado para o Editor de Script do Google Sheets

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getChamados') {
    return getChamados();
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: 'Ação não reconhecida'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  if (action === 'addChamado') {
    return addChamado(data.data);
  } else if (action === 'updateChamado') {
    return updateChamado(data.id, data.data);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: 'Ação não reconhecida'
  })).setMimeType(ContentService.MimeType.JSON);
}

function getChamados() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Chamado');
    
    // Obter dados da planilha (excluindo cabeçalho)
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        chamados: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Extrair cabeçalhos
    const headers = values[0];
    
    // Converter dados para array de objetos
    const chamados = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const chamado = {};
      
      for (let j = 0; j < headers.length; j++) {
        chamado[headers[j]] = row[j];
      }
      
      chamados.push(chamado);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      chamados: chamados
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function addChamado(chamadoData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Chamado');
    
    // Obter cabeçalhos
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Gerar ID para o novo chamado
    const lastRow = sheet.getLastRow();
    let newId = 1;
    
    if (lastRow > 1) {
      const lastId = sheet.getRange(lastRow, 1).getValue();
      newId = typeof lastId === 'number' ? lastId + 1 : 1;
    }
    
    // Preparar dados para inserção
    const rowData = [];
    rowData.push(newId); // ID
    
    // Preencher os dados na ordem dos cabeçalhos
    for (let i = 1; i < headers.length; i++) {
      const header = headers[i];
      rowData.push(chamadoData[header] || '');
    }
    
    // Inserir nova linha
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      id: newId
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateChamado(id, updateData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Chamado');
    
    // Obter cabeçalhos
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Encontrar a linha do chamado pelo ID
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == id) {
        rowIndex = i + 1; // +1 porque os índices de linha começam em 1
        break;
      }
    }
    
    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Chamado não encontrado'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Atualizar os campos
    for (const key in updateData) {
      const colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(updateData[key]);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
