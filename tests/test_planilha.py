import copy
import json
import socket
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from openpyxl import Workbook

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'manutencao'))
from atualizar_planilha import (aplicar, assinatura, consolidar, contagens,
                               ler_checklists, ler_json, preparar, publico)
from preparar_kit import criar_kit


def pessoa():
    return {'matricula': 'U1', 'nome': 'JOSE DA SILVA', 'area': 'STC',
            'classificacao': 'Ciclo+10', 'referencia_base': '2026-09',
            'meta_mes': 3, 'meta_01_10': 1, 'meta_11_20': 1, 'meta_21_31': 1}


def inspecoes(dias):
    return [{'matricula': 'U1', 'data': dia} for dia in dias]


def escrever(path, valor):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(valor, ensure_ascii=False), encoding='utf-8')


def planilha(path, linhas):
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(['ID', 'Origem', 'Inspetor', 'Data de Execução', 'Empresa do Inspetor'])
    for linha in linhas:
        sheet.append(list(linha) + ['Empresa de teste'])
    workbook.save(path)
    workbook.close()


class TestePlanilha(unittest.TestCase):
    def test_comparacao_sem_duplicidade(self):
        historico = inspecoes(['2026-10-01'] * 2)
        novos = inspecoes(['2026-10-01', '2026-10-02', '2026-10-02'])
        resultado = consolidar(historico, novos, mensal=True)
        self.assertEqual(len(resultado), 3)
        self.assertEqual(contagens(resultado)[('U1', '2026-10-02')], 1)
        self.assertEqual(len(consolidar(historico, novos[:1], mensal=True)), 2)
        self.assertEqual(len(consolidar([], novos, mensal=True)), 3)
        self.assertEqual(len(consolidar(historico, novos, mensal=False)), 4)
        self.assertEqual(len(consolidar(historico, inspecoes(['2026-11-01']), mensal=True)), 3)

    def criar_projeto(self, root):
        pessoas = [pessoa()]
        pms = inspecoes(['2026-10-01', '2026-10-01'])
        ah = inspecoes(['2026-10-02'])
        privado = {'atualizado_em': '01/11/2026 08:00', 'inspetores': pessoas, 'inspecoes': pms + ah}
        privado_ah = {'atualizado_em': '01/11/2026 08:00', 'inspetores': pessoas, 'inspecoes': ah}
        fake = {'id': 'temporario', 'coleta_em': privado['atualizado_em']}
        for nome, dados, prefixo in [('dados', privado, 'INSPETOR'), ('altas_horas', privado_ah, 'INSPETOR_AH')]:
            escrever(root / f'data/{nome}.json', dados)
            saida = publico(pessoas, dados['inspecoes'], prefixo, dados['atualizado_em'], fake)
            for campo in ['modo_atualizacao', 'base_historica_id', 'base_historica_em']:
                saida.pop(campo)
            escrever(root / f'data/{nome}_publico.json', saida)
        (root / 'scripts').mkdir(exist_ok=True)
        linhas = [[1, 'PMS', 'José Silva', '01/10/2026'],
                  [2, 'PMS', 'JOSE DA SILVA', '01/10/2026'],
                  [3, 'PMS', 'JOSE DA SILVA', '03/10/2026'],
                  [3, 'PMS', 'JOSE DA SILVA', '03/10/2026'],
                  [4, 'Altas Horas', 'JOSE DA SILVA', '02/10/2026'],
                  [5, 'Altas Horas', 'JOSE DA SILVA', '02/10/2026']]
        planilha(root / 'scripts/Checklists Realizados.xlsx', linhas)
        zip_path = root / 'bkp/kit.zip'
        base = criar_kit(root, zip_path)
        with zipfile.ZipFile(zip_path) as arquivo:
            self.assertEqual(set(arquivo.namelist()),
                             {'scripts/ferias/base.json', 'scripts/Checklists Realizados.xlsx', 'LEIA_KIT.txt'})
            arquivo.extractall(root)
        return base

    def test_integracao_repeticao_relatorio_parcial_e_bloqueio(self):
        with tempfile.TemporaryDirectory() as pasta:
            root = Path(pasta)
            self.criar_projeto(root)
            # A rotina não depende de rede, Snowflake, pandas ou credenciais.
            with patch.object(socket.socket, 'connect', side_effect=AssertionError('Rede proibida')):
                saidas = preparar(root)
            self.assertEqual(len(saidas['data/dados_publico.json']['inspecoes']), 5)
            aplicar(root, saidas)
            repeticao = preparar(root)
            self.assertEqual(saidas['data/dados_publico.json']['inspecoes'],
                             repeticao['data/dados_publico.json']['inspecoes'])
            # Um relatório posterior parcial deve acumular o novo ID sem apagar os anteriores.
            planilha(root / 'scripts/Checklists Realizados.xlsx',
                     [[6, 'PMS', 'JOSE DA SILVA', '04/10/2026']])
            parcial = preparar(root)
            self.assertEqual(len(parcial['data/dados_publico.json']['inspecoes']), 6)
            self.assertEqual(len(parcial['scripts/ferias/estado.json']['registros']), 6)
            self.assertNotIn('U1', json.dumps(parcial['data/dados_publico.json']))
            # Uma coleta completa de outro publicador bloqueia o kit antigo.
            outro = copy.deepcopy(saidas['data/dados_publico.json'])
            outro.pop('base_historica_id')
            escrever(root / 'data/dados_publico.json', outro)
            with self.assertRaisesRegex(ValueError, 'histórico público mudou'):
                preparar(root)

    def test_ids_divergentes_e_data_invalida(self):
        with tempfile.TemporaryDirectory() as pasta:
            root = Path(pasta)
            base = self.criar_projeto(root)
            path = root / 'scripts/Checklists Realizados.xlsx'
            planilha(path, [[1, 'PMS', 'JOSE SILVA', '01/10/2026'],
                            [1, 'PMS', 'JOSE SILVA', '02/10/2026']])
            with self.assertRaisesRegex(ValueError, 'ID com dados divergentes'):
                ler_checklists(path, base)
            planilha(path, [[1, 'PMS', 'JOSE SILVA', 'sem data']])
            with self.assertRaisesRegex(ValueError, 'Data de execução inválida'):
                ler_checklists(path, base)
            planilha(path, [[None, 'PMS', 'JOSE SILVA', '01/10/2026']])
            with self.assertRaisesRegex(ValueError, 'sem ID'):
                ler_checklists(path, base)


if __name__ == '__main__':
    unittest.main()
