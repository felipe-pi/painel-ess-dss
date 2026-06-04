import snowflake.connector
import pandas as pd
import json

from datetime import datetime


# ==========================
# CONEXÃO
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
# PLANILHA
# ==========================

df_meta = pd.read_excel(
    "base_inspetores.xlsx"
)

df_meta.columns = (

    df_meta.columns

    .str.strip()

    .str.replace(
        r"\s+",
        " ",
        regex=True
    )
)


# matrícula
df_meta["Matricula"] = (

    df_meta["Matricula"]

    .astype(str)

    .str.strip()

    .str.upper()
)

df_meta["Matricula"] = (

    df_meta["Matricula"]

    .apply(

        lambda x:

        x
        if x.startswith("U")

        else "U" + x
    )
)


# área
df_meta["AREA"] = (

    df_meta["AREA"]

    .astype(str)

    .str.strip()

    .str.upper()
)


# ==========================
# LISTA INSPETORES
# ==========================

inspetores_lista = (

    df_meta["Matricula"]

    .dropna()

    .unique()

    .tolist()
)

inspetores_sql = ",".join([

    f"'{x}'"

    for x in inspetores_lista
])


# ==========================
# QUERY SNOWFLAKE
# ==========================

query = f"""
SELECT

    UPPER(TRIM(CREATEDBY)) AS MATRICULA,

    CAST(EXECUTEDDATE AS DATE) AS DATA_INSPECAO

FROM EQTLINFO_RAW.ESS.SINGULAR_CHECKLISTS

WHERE
    
    requestingareaid = 44
    
    AND
    
    INSPECTIONTYPE = 2

    AND UPPER(TRIM(CREATEDBY))
        IN ({inspetores_sql})

    AND CREATEDBY IS NOT NULL
"""

conn = get_connection()

df_sf = pd.read_sql(
    query,
    conn
)

conn.close()


# ==========================
# JSON INSPETORES
# ==========================

inspetores = []

for _, row in df_meta.iterrows():

    inspetores.append({

        "matricula":
            row["Matricula"],

        "nome":
            str(
                row[
                    "NOME DO INSPETOR"
                ]
            ).strip(),

        "area":
            str(
                row["AREA"]
            ).strip(),

        "meta_mes":
            int(
                row["TOTAL"]
            ),

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
            )
    })


# ==========================
# JSON INSPEÇÕES
# ==========================

inspecoes = []

for _, row in df_sf.iterrows():

    if pd.isna(
        row["DATA_INSPECAO"]
    ):
        continue

    inspecoes.append({

        "matricula":
            row["MATRICULA"],

        "data":
            row[
                "DATA_INSPECAO"
            ].strftime(
                "%Y-%m-%d"
            )
    })
# ==========================
# JSON FINAL
# ==========================

dados = {

    "atualizado_em":

    datetime.now()

    .strftime(
        "%d/%m/%Y %H:%M"
    ),

    "inspetores":
        inspetores,

    "inspecoes":
        inspecoes
}


with open(

    "../data/dados.json",

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
)

