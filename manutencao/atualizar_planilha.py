"""Atualização offline de ESS/Altas Horas. Não consulta nem importa Snowflake."""
import argparse
import copy
import hashlib
import json
import os
import re
import shutil
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook


PUBLICOS = ('dados_publico.json', 'altas_horas_publico.json')


def ler_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def assinatura(objeto):
    texto = json.dumps(objeto, sort_keys=True, ensure_ascii=False, allow_nan=False)
    return hashlib.sha256(texto.encode('utf-8')).hexdigest()


def normalizar(valor):
    texto = ''.join(c for c in unicodedata.normalize('NFD', str(valor or '').upper())
                    if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Z0-9]+', ' ', texto).strip()


def chave_nome(nome):
    return ' '.join(p for p in normalizar(nome).split() if p not in {'DA', 'DAS', 'DE', 'DO', 'DOS', 'E'})


def mapa_nomes(inspetores):
    mapa = {}
    for pessoa in inspetores:
        chave = chave_nome(pessoa['nome'])
        matricula = pessoa['matricula']
        if chave in mapa and mapa[chave] != matricula:
            raise ValueError('Há nomes ambíguos no cadastro de partida; revisar antes de continuar.')
        mapa[chave] = matricula
    return mapa


def ler_checklists(path, base):
    mapas = {origem: mapa_nomes(base[origem]['inspetores']) for origem in ('PMS', 'ALTAS HORAS')}
    workbook = load_workbook(path, read_only=True, data_only=True)
    registros, ignorados = {}, Counter()
    try:
        linhas = workbook.active.iter_rows(values_only=True)
        cabecalho = [normalizar(v) for v in next(linhas)]
        indices = {}
        for nome, termos in {'id': ('ID',), 'origem': ('ORIGEM',),
                             'nome': ('INSPETOR',), 'data': ('DATA', 'EXECUCAO')}.items():
            encontrados = [i for i, c in enumerate(cabecalho)
                           if (c == 'ID' if nome == 'id' else all(t in c.split() for t in termos))]
            exatos = [i for i in encontrados if cabecalho[i] == ' '.join(termos)]
            if exatos:
                encontrados = exatos
            if len(encontrados) != 1:
                raise ValueError(f'Coluna ausente ou ambígua na planilha: {nome}.')
            indices[nome] = encontrados[0]
        for numero, linha in enumerate(linhas, start=2):
            origem = normalizar(linha[indices['origem']])
            if origem not in mapas:
                continue
            matricula = mapas[origem].get(chave_nome(linha[indices['nome']]))
            if not matricula:
                ignorados[origem] += 1
                continue
            identificador = linha[indices['id']]
            if identificador is None or not str(identificador).strip():
                raise ValueError(f'Checklist sem ID na linha {numero}.')
            if isinstance(identificador, float) and identificador.is_integer():
                identificador = int(identificador)
            valor_data = linha[indices['data']]
            if isinstance(valor_data, (datetime, date)):
                data_execucao = valor_data.strftime('%Y-%m-%d')
            else:
                texto = str(valor_data or '').strip()
                data_execucao = None
                for formato in ('%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M', '%d/%m/%Y',
                                '%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
                    try:
                        data_execucao = datetime.strptime(texto, formato).strftime('%Y-%m-%d')
                        break
                    except ValueError:
                        pass
                if data_execucao is None:
                    raise ValueError(f'Data de execução inválida na linha {numero}.')
            registro = {'origem': origem, 'id': str(identificador).strip(),
                        'matricula': matricula, 'data': data_execucao}
            chave = (origem, registro['id'])
            if chave in registros and registros[chave] != registro:
                raise ValueError(f'ID com dados divergentes na planilha: {registro["id"]}.')
            registros[chave] = registro
    finally:
        workbook.close()
    if not registros:
        raise ValueError('Nenhum checklist válido para o cadastro do painel. Confira o arquivo selecionado.')
    return registros, ignorados


def contagens(inspecoes):
    return Counter((i['matricula'], i['data']) for i in inspecoes)


def expandir(contagem):
    return [{'matricula': matricula, 'data': dia}
            for (matricula, dia), quantidade in sorted(contagem.items()) for _ in range(quantidade)]


def consolidar(historico, planilha, mensal):
    """Maior total mensal (PMS) ou diário (AH), sem somar fontes sobrepostas."""
    original, atual = contagens(historico), contagens(planilha)
    resultado = original.copy()
    if not mensal:
        for chave, quantidade in atual.items():
            resultado[chave] = max(quantidade, original[chave])
        return expandir(resultado)
    meses = defaultdict(list)
    for (matricula, dia), quantidade in atual.items():
        meses[(matricula, dia[:7])].append((dia, quantidade))
    for (matricula, mes), dias in meses.items():
        total_historico = sum(q for (m, d), q in original.items() if m == matricula and d.startswith(mes))
        excedente = max(sum(q for _, q in dias) - total_historico, 0)
        for dia, quantidade in sorted(dias):
            adicionar = min(max(quantidade - original[(matricula, dia)], 0), excedente)
            resultado[(matricula, dia)] += adicionar
            excedente -= adicionar
    return expandir(resultado)


def publico(inspetores, inspecoes, prefixo, atualizado, base):
    pessoas, mapa = [], {}
    for numero, pessoa in enumerate(inspetores, start=1):
        item = copy.deepcopy(pessoa)
        alias = f'{prefixo}_{numero:02d}'
        mapa[pessoa['matricula']] = alias
        item['matricula'] = alias
        item['nome'] = ' '.join(str(pessoa['nome']).split()[:2]).title()
        pessoas.append(item)
    return {'atualizado_em': atualizado, 'modo_atualizacao': 'planilha',
            'base_historica_id': base['id'], 'base_historica_em': base['coleta_em'],
            'inspetores': pessoas,
            'inspecoes': [{'matricula': mapa[i['matricula']], 'data': i['data']}
                          for i in inspecoes if i['matricula'] in mapa]}


def preparar(projeto):
    pasta = projeto / 'scripts/ferias'
    base = ler_json(pasta / 'base.json')
    for nome in PUBLICOS:
        atual = ler_json(projeto / 'data' / nome)
        mesma_base = atual.get('base_historica_id') == base['id'] and atual.get('modo_atualizacao') == 'planilha'
        if not mesma_base and assinatura(atual) != base['assinaturas_publicas'][nome]:
            raise ValueError('O histórico público mudou desde a preparação do kit. '
                             'Não sobrescreva: peça um kit atualizado ao responsável.')
    estado_path = pasta / 'estado.json'
    estado = ler_json(estado_path) if estado_path.exists() else {'base_id': base['id'], 'registros': []}
    if estado['base_id'] != base['id']:
        raise ValueError('Estado de outra base histórica. Use o kit e seu estado correspondentes.')
    registros = {(r['origem'], r['id']): r for r in estado['registros']}
    novos, ignorados = ler_checklists(projeto / 'scripts/Checklists Realizados.xlsx', base)
    registros.update(novos)
    ledger = list(registros.values())
    pms = consolidar(base['PMS']['inspecoes'], [r for r in ledger if r['origem'] == 'PMS'], mensal=True)
    altas = consolidar(base['ALTAS HORAS']['inspecoes'],
                       [r for r in ledger if r['origem'] == 'ALTAS HORAS'], mensal=False)
    matriculas_ess = {i['matricula'] for i in base['PMS']['inspetores']}
    ess = pms + [i for i in altas if i['matricula'] in matriculas_ess]
    atualizado = datetime.now().strftime('%d/%m/%Y %H:%M')
    saidas = {'data/dados_publico.json': publico(base['PMS']['inspetores'], ess, 'INSPETOR', atualizado, base),
              'data/altas_horas_publico.json': publico(base['ALTAS HORAS']['inspetores'], altas,
                                                       'INSPETOR_AH', atualizado, base),
              'scripts/ferias/estado.json': {'base_id': base['id'], 'registros': ledger}}
    print(f'Histórico de partida: {base["coleta_em"]}; Snowflake não consultado.')
    print(f'ESS: {len(ess)} inspeções; Altas Horas: {len(altas)}; IDs acumulados: {len(ledger)}.')
    for origem, quantidade in ignorados.items():
        print(f'AVISO: {quantidade} linhas de {origem} sem correspondência no cadastro foram ignoradas.')
    print('DSS preservado com a data de sua última atualização.')
    return saidas


def aplicar(projeto, saidas):
    backup = projeto / 'bkp' / ('planilha_' + datetime.now().strftime('%Y%m%d_%H%M%S_%f'))
    backup.mkdir(parents=True)
    temporarios = []
    anteriores = {}
    try:
        for nome, conteudo in saidas.items():
            destino = projeto / nome
            anteriores[destino] = destino.exists()
            destino.parent.mkdir(parents=True, exist_ok=True)
            if destino.exists():
                copia = backup / nome
                copia.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(destino, copia)
            temporario = destino.with_suffix(destino.suffix + '.tmp')
            with temporario.open('w', encoding='utf-8', newline='\n') as arquivo:
                json.dump(conteudo, arquivo, ensure_ascii=False, indent=4, allow_nan=False)
                arquivo.flush()
                os.fsync(arquivo.fileno())
            temporarios.append((destino, temporario))
        for destino, temporario in temporarios:
            os.replace(temporario, destino)
    except BaseException:
        for destino, _ in temporarios:
            copia = backup / destino.relative_to(projeto)
            if copia.exists():
                shutil.copy2(copia, destino)
            elif not anteriores[destino]:
                destino.unlink(missing_ok=True)
        raise
    finally:
        for _, temporario in temporarios:
            temporario.unlink(missing_ok=True)
    print('Arquivos gravados. Backup:', backup)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--projeto', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--aplicar', action='store_true')
    args = parser.parse_args()
    pasta = args.projeto / 'scripts/ferias'
    lock = pasta / 'atualizacao.lock'
    with lock.open('x', encoding='utf-8') as arquivo:
        arquivo.write(str(os.getpid()))
    try:
        saidas = preparar(args.projeto)
        if args.aplicar:
            aplicar(args.projeto, saidas)
        else:
            print('Simulação: nenhum arquivo de dados foi alterado.')
    finally:
        lock.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
