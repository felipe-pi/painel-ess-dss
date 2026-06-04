import pandas as pd
import json
from datetime import datetime


# ==========================
# ARQUIVOS
# ==========================

ARQUIVO_DSS = "Diálogo Semanal de Segurança 1.xlsx"
ARQUIVO_METAS = "base_metas_dss.xlsx"
SAIDA_JSON = "../data/dss.json"


# ==========================
# FUNÇÕES
# ==========================

def limpar_colunas(df):
    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
        .str.replace(r"\s+", " ", regex=True)
    )
    return df


def normalizar_texto(valor):
    if pd.isna(valor):
        return ""

    return (
        str(valor)
        .strip()
        .upper()
    )


def converter_data(valor):
    if pd.isna(valor):
        return None

    data = pd.to_datetime(
        valor,
        errors="coerce",
        dayfirst=True
    )

    if pd.isna(data):
        return None

    return data.strftime("%Y-%m-%d")


def converter_numero(valor):
    if pd.isna(valor):
        return 0

    try:
        return int(float(valor))
    except:
        return 0


# ==========================
# LER BASE DSS
# ==========================

df_dss = pd.read_excel(
    ARQUIVO_DSS,
    sheet_name="Sheet1"
)

df_dss = limpar_colunas(df_dss)


# ==========================
# LER METAS DSS
# ==========================

df_metas = pd.read_excel(
    ARQUIVO_METAS
)

df_metas = limpar_colunas(df_metas)


# ==========================
# DEBUG COLUNAS
# ==========================

print("COLUNAS DSS:")
print(df_dss.columns.tolist())

print("\nCOLUNAS METAS:")
print(df_metas.columns.tolist())


# ==========================
# MAPEAR COLUNAS DSS
# ==========================

COL_DATA = "Data da realização do DSS?"
COL_NOME = "NOME COMPLETO (APRESENTADOR DO DS - MAIÚSCULO)"
COL_MATRICULA = "MATRÍCULA (APRESENTADOR DO DS)"
COL_AREA = "ÁREA"
COL_REGIONAL = "Regional"
COL_PARTICIPANTES = "Quantidade de participantes do DS?"


# ==========================
# MAPEAR COLUNAS METAS
# ==========================

COL_META_AREA = "Área"
COL_META = "Meta"


# ==========================
# GERAR LISTA DSS
# ==========================

dss = []

for _, row in df_dss.iterrows():

    data = converter_data(
        row.get(COL_DATA)
    )

    if not data:
        continue

    area = normalizar_texto(
        row.get(COL_AREA)
    )

    regional = normalizar_texto(
        row.get(COL_REGIONAL)
    )

    nome = normalizar_texto(
        row.get(COL_NOME)
    )

    matricula = normalizar_texto(
        row.get(COL_MATRICULA)
    )

    participantes = converter_numero(
        row.get(COL_PARTICIPANTES)
    )

    dss.append({
        "data": data,
        "regional": regional,
        "area": area,
        "nome": nome,
        "matricula": matricula,
        "participantes": participantes
    })


# ==========================
# GERAR METAS ÁREA
# ==========================

metas_area = []

for _, row in df_metas.iterrows():

    area = normalizar_texto(
        row.get(COL_META_AREA)
    )

    meta = converter_numero(
        row.get(COL_META)
    )

    if not area:
        continue

    metas_area.append({
        "area": area,
        "meta": meta
    })


# ==========================
# JSON FINAL
# ==========================

dados = {
    "atualizado_em": datetime.now().strftime("%d/%m/%Y %H:%M"),
    "metas_area": metas_area,
    "dss": dss
}


with open(
    SAIDA_JSON,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        dados,
        f,
        ensure_ascii=False,
        indent=4
    )


print("\nJSON DSS gerado com sucesso!")
print(f"Total DSS: {len(dss)}")
print(f"Total áreas com meta: {len(metas_area)}")