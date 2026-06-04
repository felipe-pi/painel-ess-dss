import json
import copy

def primeiro_segundo_nome(nome):
    if nome is None:
        return ""

    partes = str(nome).strip().split()

    if len(partes) == 0:
        return ""

    if len(partes) == 1:
        return partes[0].title()

    return f"{partes[0].title()} {partes[1].title()}"
def reduzir_nome(nome, prefixo="COLABORADOR", contador=1):
    if nome is None:
        return f"{prefixo} {contador:02d}"

    nome = str(nome).strip()

    if not nome:
        return f"{prefixo} {contador:02d}"

    partes = nome.split()

    if len(partes) == 1:
        return partes[0].title()

    primeiro = partes[0]
    ultimo = partes[-1]

    return f"{primeiro.title()} {ultimo.title()}"

def anonimizar_lista(registros, prefixo):
    mapa = {}
    contador = 1

    saida = []

    for item in registros:
        novo = copy.deepcopy(item)

        chave = (
            novo.get("matricula")
            or novo.get("nome")
            or f"{prefixo}_{contador}"
        )

        if chave not in mapa:
            nome_real = novo.get("nome", "")

            # usa primeiro + último nome
            nome_publico = reduzir_nome(nome_real, prefixo, contador)

            # evita nomes duplicados
            if nome_publico in mapa.values():
                nome_publico = f"{nome_publico} {contador}"

            mapa[chave] = nome_publico
            contador += 1

        novo["nome"] = mapa[chave]

        # matrícula mascarada
        if "matricula" in novo:
            novo["matricula"] = ""

        saida.append(novo)

    return saida, mapa

# ======================
# ESS
# ======================

with open("../data/dados.json", "r", encoding="utf-8") as f:
    dados = json.load(f)

mapa_ess = {}
inspetores_publicos = []

for idx, item in enumerate(dados["inspetores"], start=1):
    novo = copy.deepcopy(item)

    matricula_real = novo.get("matricula")
    alias = f"INSPETOR_{idx:02d}"
    nome_real = novo.get("nome", "")
    nome_publico = primeiro_segundo_nome(nome_real)

    mapa_ess[matricula_real] = alias

    novo["matricula"] = alias
    novo["nome"] = nome_publico

    inspetores_publicos.append(novo)


inspecoes_publicas = []

for item in dados["inspecoes"]:
    novo = copy.deepcopy(item)

    matricula_real = novo.get("matricula")

    if matricula_real in mapa_ess:
        novo["matricula"] = mapa_ess[matricula_real]
        inspecoes_publicas.append(novo)

dados_publico = {
    "atualizado_em": dados["atualizado_em"],
    "inspetores": inspetores_publicos,
    "inspecoes": inspecoes_publicas
}

with open("../data/dados_publico.json", "w", encoding="utf-8") as f:
    json.dump(dados_publico, f, ensure_ascii=False, indent=4)
# ======================
# DSS
# ======================

with open("../data/dss.json", "r", encoding="utf-8") as f:
    dss = json.load(f)

dss_publico_lista, mapa_dss = anonimizar_lista(
    dss["dss"],
    "COLABORADOR"
)

dss_publico = {
    "atualizado_em": dss["atualizado_em"],
    "metas_area": dss["metas_area"],
    "dss": dss_publico_lista
}

with open("../data/dss_publico.json", "w", encoding="utf-8") as f:
    json.dump(dss_publico, f, ensure_ascii=False, indent=4)


print("JSONs públicos gerados com sucesso!")
print("data/dados_publico.json")
print("data/dss_publico.json")