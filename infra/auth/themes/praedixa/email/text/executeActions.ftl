<#ftl output_format="plainText">
<#assign requiredActionsText><#if requiredActions??><#list requiredActions><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#sep></#items></#list></#if></#assign>
<#assign passwordSetupOnly=requiredActions?? && (requiredActions?size == 1) && requiredActions?seq_contains("UPDATE_PASSWORD")>

${msg("emailGreeting")}

${msg("executeActionsIntro")}

<#if passwordSetupOnly>
${msg("executeActionsPasswordSetupText")}
<#else>
${msg("executeActionsGenericText", requiredActionsText)}
</#if>

${link}

${msg("executeActionsExpiryText", linkExpirationFormatter(linkExpiration))}

${msg("executeActionsIgnoreText")}
