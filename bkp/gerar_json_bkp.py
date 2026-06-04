
""" import snowflake.connector
import pandas as pd
import json
from datetime import datetime
import numpy as np


# ==========================
# CONEXÃO SNOWFLAKE
# ==========================

def get_connection():

    conn = snowflake.connector.connect(
        user='felipe.ramos@equatorialenergia.com.br',
        account='cfgkdtb-isb76799',
        authenticator='externalbrowser',
        warehouse='WH_EQTLINFO',
        database='EQTLINFO_RAW',
        schema='ESS',
        role='GRP_SWF_PBL'
    )

    return conn


# ==========================
# PADRONIZA MATRÍCULA
# ==========================

def padronizar_matricula(valor):

    if pd.isna(valor):
        return None

    valor = str(valor)

    valor = valor.strip()

    valor = valor.upper()


    valor = valor.replace("U", "")

    valor = valor.replace(".0", "")

    valor = valor.strip()

    return f"U{valor}"

# ==========================
# LER BASE DE INSPETORES
# ==========================
df_base = pd.read_excel(
    "base_inspetores.xlsx"
)

df_base.columns = df_base.columns.str.strip()

df_base = df_base.rename(columns={

    "Matricula": "matricula",

    "NOME DO INSPETOR":
        "nome",

    "META DE 01 a 10":
        "meta_01_10",

    "META DE 11 a 20":
        "meta_11_20",

    "META DE 21 a 31":
        "meta_21_31",

    "TOTAL":
        "meta_mes"
})


df_base["matricula"] = df_base[
    "matricula"
].apply(
    padronizar_matricula
)

# ==========================
# PLANILHA DE METAS
# ==========================

df_meta = pd.read_excel(
    "base_inspetores.xlsx"
)

# limpar colunas
df_meta.columns = (

    df_meta.columns

    .str.strip()

    .str.replace(
        r"\s+",
        " ",
        regex=True
    )

)

print(
    df_meta.columns.tolist()
)

# padronizar matrícula
df_meta["Matricula"] = (
    df_meta["Matricula"]
    .astype(str)
    .str.strip()
    .str.upper()
)

# adicionar U caso não tenha
df_meta["Matricula"] = (
    df_meta["Matricula"]
    .apply(
        lambda x:
        x if x.startswith("U")
        else "U" + x
    )
)

# limpar área
df_meta["AREA"] = (
    df_meta["AREA"]
    .astype(str)
    .str.strip()
    .str.upper()
)
# ==========================
# CONSULTA SNOWFLAKE
# ==========================

conn = get_connection()

""" = """query
SELECT
    CREATEDBY,
    COUNT(*) AS REALIZADO
FROM EQTLINFO_RAW.ESS.SINGULAR_CHECKLISTS
WHERE INSPECTIONTYPE = 2
GROUP BY CREATEDBY
"""
"""
df_sf = pd.read_sql(
    query,
    conn
)

conn.close()


# ==========================
# PADRONIZAR MATRÍCULA
# ==========================

# ==========================
# PADRONIZAR CREATEDBY
# ==========================


df_sf["CREATEDBY"] = (

    df_sf["CREATEDBY"]

    .astype(str)

    .str.strip()

    .str.upper()
)

print(
    df_sf[
        [
            "CREATEDBY",
            "REALIZADO"
        ]
    ]
    .head(10)
)
# ==========================
# DICIONÁRIO DE REALIZADOS
# ==========================

realizados_dict = dict(

    zip(
        df_sf["CREATEDBY"],
        df_sf["REALIZADO"]
    )
)
# ==========================
# JSON FINAL
# ==========================

inspetores = []

print("\n========== TESTE MATCH ==========")

print("\nPLANILHA:")
print(
    df_meta["Matricula"]
    .head(10)
    .tolist()
)

print("\nSNOWFLAKE:")
print(
    df_sf["CREATEDBY"]
    .head(10)
    .tolist()
)

for _, row in df_meta.iterrows():

    matricula = row["Matricula"]
    
    if matricula == "U1106793":
    
        print("\nTESTANDO MATCH:")
        print("PLANILHA:", matricula)
        print(
            "REALIZADO:",
            realizados_dict.get(
                matricula,
                "NAO ACHOU"
            )
        )
    realizado = (
        realizados_dict
        .get(matricula, 0)
    )

    meta_mes = (
        row["TOTAL"]
        if pd.notna(row["TOTAL"])
        else 0
    )

    # PERFORMANCE
    performance = 0

    performance_real = (
    realizado / meta_mes * 100
        if meta_mes > 0
        else 0
    )

    # trava em 100%
    performance = min(
        performance_real,
        100
    )

    # STATUS VISUAL
    if performance >= 100:

        status = "verde"

    elif performance >= 70:

        status = "amarelo"

    else:

        status = "vermelho"


    inspetores.append({

        "matricula":
            matricula,

        "nome":
            str(
                row[
                    "NOME DO INSPETOR"
                ]
            ).strip(),

        "area":
            str(
                row["AREA"]
            )
            .strip()
            .upper(),

        "meta_mes":
            int(meta_mes),

        "meta_01_10":
            int(
                row[
                    "META DE 01 a 10"
                ]
            ),

        "meta_11_20":
            int(
                row[
                    "META DE 11 a 20"
                ]
            ),

        "meta_21_31":
            int(
                row[
                    "META DE 21 a 31"
                ]
            ),

        "realizado":
            int(realizado),

        "gap":
            max(
                int(meta_mes)
                - int(realizado),
                0
            ),

        "performance":
            performance,

        "status":
            status
    })


# ==========================
# ORDENAÇÃO
# ==========================

inspetores = sorted(

    inspetores,

    key=lambda x: (

        x["performance"],
        x["realizado"]

    ),

    reverse=True
)


# ==========================
# GERAR JSON
# ==========================

dados = {

    "atualizado_em":
        datetime.now().strftime(
            "%d/%m/%Y %H:%M"
        ),

    "inspetores":
        inspetores
}


with open(

    "dados.json",

    "w",

    encoding="utf-8"

) as f:

    json.dump(

        dados,

        f,

        ensure_ascii=False,

        indent=4
    )

print(
    "JSON gerado com sucesso!"
) """