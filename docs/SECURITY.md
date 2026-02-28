# Security Notes

Resumo das medidas de seguranca aplicadas e praticas recomendadas.

## Controles implementados
- Sessao assinada no portal (`nm_session`) com exp.
- Comparacao de assinatura com `timingSafeEqual`.
- Sessao admin assinada via cookie HttpOnly (`as_admin_session`) com `SameSite=Strict`.
- Login admin com usuario/senha e bloqueio temporario por tentativas excessivas.
- Criptografia de token OAuth em armazenamento local.
- Hash de token de bot por instancia.
- Possibilidade de proteger admin com bearer token.
- Validacao opcional de assinatura em webhook Mercado Pago.
- Escrita atomica de arquivos para reduzir corrupcao.

## Hardening recomendado
1. Sempre definir `PORTAL_SESSION_SECRET` forte.
2. Sempre definir `ADMIN_PANEL_TOKEN` em producao.
3. Rodar portal/admin atras de HTTPS reverso.
4. Restringir acesso de rede ao admin.
5. Rotacionar credenciais de pagamento periodicamente.
6. Ativar backup recorrente de `data/` e `logs/`.
7. Evitar executar com usuario privilegiado.

## Gestao de segredos
- Nunca commitar `.env`.
- Armazenar segredos em cofre (ou equivalente).
- Separar credenciais por ambiente (dev/hml/prod).

## Auditoria minima recomendada
- Revisar logs de login/admin.
- Revisar transacoes e saques incomuns.
- Revisar instancias com erro recorrente.
- Revisar contas bloqueadas/desbloqueadas.

## Itens de atencao futura
- Rate limit por endpoint sensivel.
- MFA para operacoes administrativas.
- Trilha de auditoria assinada para acoes criticas.
- Migracao para storage com criptografia em repouso.
