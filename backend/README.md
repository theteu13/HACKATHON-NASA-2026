# Backend Python · CosmoMedic

API FastAPI compatível com o dashboard existente. O mesmo servidor entrega o
frontend em `/`, a API em `/api/v1` e a documentação interativa em `/docs`.

## Executar no Windows

Na raiz do projeto, com Python 3.10 ou mais recente:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\start-backend.ps1
```

O script solicita uma senha local sem exibi-la. Abra http://127.0.0.1:8000,
selecione **Connect API**, mantenha essa origem e entre com o usuário `surgeon`
e a senha escolhida. Você pode selecionar **CosmoMedic app** ou **Synthetic
mission**. A página inicia em demo até o login; **Refresh** lê novamente a API e
**Disconnect** retorna ao demo. Reiniciar o servidor invalida as sessões.

Para executar diretamente ou em outros sistemas, configure `COSMOMEDIC_PASSWORD`
no ambiente e rode, a partir da raiz:

```text
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Use o Python do ambiente virtual. Não é necessário instalar Node para executar a
aplicação. Os scripts de preview estático existentes continuam disponíveis.

## Organização

- `main.py`: aplicação, CORS, cache e arquivos públicos.
- `config.py`: configuração pelo ambiente.
- `auth.py`: login, verificação de senha e sessões Bearer.
- `routes.py`: endpoints compatíveis com o frontend.
- `repository.py`: leitura e projeção dos datasets.
- `tests/`: testes HTTP, autenticação, privacidade e contrato.

## Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `COSMOMEDIC_USERNAME` | `surgeon` | Conta local da equipe de saúde |
| `COSMOMEDIC_PASSWORD` | vazio | Obrigatória para permitir login; máximo de 128 caracteres |
| `COSMOMEDIC_ROLE` | `medical` | `medical` ou `admin` |
| `COSMOMEDIC_SESSION_SECONDS` | `3600` | Expiração entre 60 e 86400 segundos |
| `COSMOMEDIC_ALLOWED_ORIGINS` | `http://127.0.0.1:4173,http://localhost:4173` | Origens extras do frontend, separadas por vírgula |

O frontend servido na mesma origem não depende de CORS. Não coloque senhas no
JavaScript nem versione arquivos `.env`.

## Dados e limites

Esta implementação é um backend local para o protótipo, com **dados fictícios**.
Ela reutiliza `data/demo-seed.js` e `data/impact-example.js`: o repositório Python
decodifica apenas o JSON das atribuições, sem executar JavaScript. A atribuição e
a licença continuam em [data/NOTICE.md](../data/NOTICE.md).

Não há banco de dados, coleta de telemetria real ou gravação de registros nesta
versão. O ponto para substituir a fonte por banco/API é `repository.py`.

As rotas autenticadas expõem somente dados físicos permitidos. Notas, nomes dos
pratos, qualidade subjetiva do sono, humor, mensagens privadas e evidências de
alertas ficam fora das respostas. O histórico sintético preserva lacunas e não
inclui dia zero. A referência de baseline usa os dias -30 a -1 e desvio padrão
amostral. O dataset sintético não traz classificações de alerta; seu status fica
indisponível, sem criar limites clínicos.

Há uma conta configurada pelo ambiente. Tokens opacos expiram e ficam somente
na memória de um processo; execute com **um worker**. Este protótipo não oferece
cadastro de usuários, recuperação de senha ou revogação individual. Antes de
expor dados reais em produção, a autenticação e o armazenamento precisam ser
integrados ao serviço de identidade e à infraestrutura da organização.

## Testar

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest backend/tests -q
```

Os testes existentes do frontend continuam sendo executados com
`node --test tests/*.test.cjs`.

Referências de implementação: [segurança HTTP Bearer](https://fastapi.tiangolo.com/reference/security/)
e [CORS](https://fastapi.tiangolo.com/tutorial/cors/) na documentação oficial do FastAPI.
