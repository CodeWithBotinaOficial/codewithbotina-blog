# Politica de Cookies - CodeWithBotina

**Ultima atualizacao:** 3 de marco de 2026

## O que sao cookies?

Cookies sao pequenos arquivos de texto armazenados no seu dispositivo quando voce visita um site. Eles sao amplamente usados para fazer os sites funcionarem de forma eficiente e para fornecer informacoes aos proprietarios do site.

## Quais cookies usamos?

### 1. Cookies estritamente necessarios

Esses cookies sao essenciais para o funcionamento do site e nao podem ser desativados.

| Cookie | Finalidade | Duracao |
|--------|------------|---------|
| `cwb_access` | Token de acesso HTTP-only para requisicoes autenticadas na API | 1 hora |
| `cwb_refresh` | Token de refresh HTTP-only usado para restaurar e renovar a sessao | 7 dias |
| `cwb_pkce` | Verificador PKCE temporario usado apenas durante o Google OAuth | 10 minutos |
| `cwb_auth_state` | Dica de estado de login (first-party) usada pelo frontend para iniciar a sessao apos redirects e reinicios do navegador | 7 dias |
| `session_id` | Identificador anonimo de sessao para registros de consentimento de cookies | Sessao |
| `cookie_consent` | Preferencias de cookies | 1 ano |

### 2. Cookies de analise (opcionais)

Nos ajudam a entender como visitantes usam o site. **Eles exigem seu consentimento.**

| Cookie | Finalidade | Duracao | Provedor |
|--------|------------|---------|----------|
| `_ga` | Google Analytics - distinguir usuarios | 2 anos | Google |
| `_gid` | Google Analytics - distinguir usuarios | 24 horas | Google |
| `_gat` | Google Analytics - limitar requisicoes | 1 minuto | Google |

Dados coletados pelo Google Analytics:

- Paginas visitadas
- Tempo no site
- Origem do trafego (busca, redes sociais, etc.)
- Dispositivo e navegador
- Localizacao aproximada (pais/cidade)

### 3. Cookies de marketing (opcionais)

Atualmente **nao** usamos cookies de marketing ou publicidade.

## Como gerenciar cookies

### Pelo nosso banner de consentimento

1. Exibido automaticamente na sua primeira visita
2. Voce pode escolher:
   - **Aceitar todos**
   - **Apenas necessarios**
   - **Configurar**

### Alterar preferencias depois

Voce pode alterar suas preferencias a qualquer momento:

1. Clique no icone de cookies no canto inferior direito
2. Ou visite: https://blog.codewithbotina.com/cookie-settings

### Pelo seu navegador

Voce pode bloquear ou excluir cookies nas configuracoes do seu navegador.

## Cookies de terceiros

Usamos servicos de terceiros que podem definir seus proprios cookies:

- Supabase (autenticacao): https://supabase.com/privacy
- Google OAuth (autenticacao): https://policies.google.com/technologies/cookies
- Cloudflare (CDN e seguranca): https://www.cloudflare.com/cookie-policy/

## Transferencias internacionais

Alguns provedores operam globalmente. Seus dados podem ser processados fora da Colombia, inclusive nos EUA e na UE, em conformidade com GDPR, CCPA e, quando aplicavel, LGPD.

## Retencao de dados

- Cookie do token de acesso: 1 hora
- Cookie do token de refresh: 7 dias
- Cookie OAuth PKCE: 10 minutos
- Dica de estado de autenticacao (frontend): 7 dias
- Cookies de analise: ate 2 anos
- Preferencias: 1 ano

## Compatibilidade com navegadores

Cookies de autenticacao sao configurados como cookies first-party com `Path=/`, `SameSite=Lax` e `Secure` em HTTPS. Tokens sensiveis sao marcados como `HttpOnly`, e o frontend determina o estado de login chamando o servidor, em vez de ler esses cookies diretamente.

## Seus direitos

Voce tem o direito de aceitar ou rejeitar cookies nao essenciais, alterar suas preferencias, excluir cookies armazenados e retirar seu consentimento a qualquer momento.

## Atualizacoes desta politica

Podemos atualizar esta politica. Alteracoes significativas serao comunicadas no site ou por email.

**Ultima revisao:** 5 de marco de 2026  
**Versao:** 1.0

## Contato

**Email:** support@codewithbotina.com  
**Web:** https://codewithbotina.com

