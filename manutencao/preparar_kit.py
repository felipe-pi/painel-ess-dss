"""Prepara um ZIP local de partida, sem tokens nem scripts de conexão."""
import argparse
import copy
import zipfile
from datetime import datetime
from pathlib import Path

from atualizar_planilha import PUBLICOS, assinatura, contagens, expandir, ler_json


def montar_base(projeto):
    dados = ler_json(projeto / 'data/dados.json')
    altas = ler_json(projeto / 'data/altas_horas.json')
    ess_publico = ler_json(projeto / 'data/dados_publico.json')
    altas_publico = ler_json(projeto / 'data/altas_horas_publico.json')
    for privado, publico in ((dados, ess_publico), (altas, altas_publico)):
        if len(privado['inspetores']) != len(publico['inspetores']):
            raise ValueError('Cadastros privado e público estão divergentes; execute a atualização completa antes.')
        mapa = {p['matricula']: a['matricula'] for p, a in zip(privado['inspetores'], publico['inspetores'])}
        esperado = {(mapa[m], d): n for (m, d), n in contagens(privado['inspecoes']).items()}
        if esperado != dict(contagens(publico['inspecoes'])):
            raise ValueError('Inspeções privadas e públicas estão divergentes; atualize as bases antes de preparar o kit.')
    if not all(i.get('metas_por_referencia') or i.get('referencia_base') for i in dados['inspetores']):
        raise ValueError('O cadastro de partida precisa conter as referências de metas.')
    matriculas = {i['matricula'] for i in dados['inspetores']}
    total = contagens(dados['inspecoes'])
    for chave, quantidade in contagens(altas['inspecoes']).items():
        if chave[0] not in matriculas:
            continue
        if total[chave] < quantidade:
            raise ValueError('Históricos ESS e Altas Horas incompatíveis; execute uma coleta completa.')
        total[chave] -= quantidade
    base = {'versao': 1, 'coleta_em': dados['atualizado_em'],
            'PMS': {'inspetores': copy.deepcopy(dados['inspetores']), 'inspecoes': expandir(total)},
            'ALTAS HORAS': copy.deepcopy(altas),
            'assinaturas_publicas': {nome: assinatura(ler_json(projeto / 'data' / nome)) for nome in PUBLICOS}}
    base['id'] = assinatura(base)
    return base


def criar_kit(projeto, destino):
    import json
    base = montar_base(projeto)
    destino.parent.mkdir(parents=True, exist_ok=True)
    if destino.exists():
        raise FileExistsError('O ZIP já existe. Escolha outro nome para preservar o kit anterior.')
    with zipfile.ZipFile(destino, 'x', compression=zipfile.ZIP_DEFLATED) as arquivo:
        arquivo.writestr('scripts/ferias/base.json', json.dumps(base, ensure_ascii=False, indent=2, allow_nan=False))
        arquivo.write(projeto / 'scripts/Checklists Realizados.xlsx', 'scripts/Checklists Realizados.xlsx')
        arquivo.writestr('LEIA_KIT.txt',
                         'Extraia na raiz do clone painel-ess-dss, ao lado de index.html.\n'
                         'Este kit contém cadastro e histórico locais. Não envie scripts/ ao GitHub.\n'
                         'Siga manutencao/GUIA_COLEGA.md. Não inclui credenciais nem acesso ao Snowflake.\n')
    print('Kit criado:', destino)
    print('Histórico de partida:', base['coleta_em'])
    print('Prepare outro kit após a última coleta completa antes das férias.')
    return base


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--projeto', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--saida', type=Path)
    args = parser.parse_args()
    destino = args.saida or args.projeto / 'bkp' / ('kit_planilha_' + datetime.now().strftime('%Y%m%d_%H%M%S') + '.zip')
    criar_kit(args.projeto, destino)
