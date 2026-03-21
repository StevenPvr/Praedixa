<#outputformat "plainText">
<#assign requiredActionsText><#if requiredActions??><#list requiredActions><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#sep></#items></#list></#if></#assign>
<#assign passwordSetupOnly=requiredActions?? && (requiredActions?size == 1) && requiredActions?seq_contains("UPDATE_PASSWORD")>
</#outputformat>

<#import "template.ftl" as layout>
<@layout.emailLayout>
<#if passwordSetupOnly>
<p>${kcSanitize(msg("emailGreeting"))?no_esc}</p>
<p>${kcSanitize(msg("executeActionsIntro"))?no_esc}</p>
<p>${kcSanitize(msg("executeActionsPasswordSetupText"))?no_esc}</p>
<p><a href="${link}">${kcSanitize(msg("executeActionsPasswordCta"))?no_esc}</a></p>
<#else>
<p>${kcSanitize(msg("emailGreeting"))?no_esc}</p>
<p>${kcSanitize(msg("executeActionsIntro"))?no_esc}</p>
<p>${kcSanitize(msg("executeActionsGenericText", requiredActionsText))?no_esc}</p>
<p><a href="${link}">${kcSanitize(msg("executeActionsGenericCta"))?no_esc}</a></p>
</#if>
<p>${kcSanitize(msg("executeActionsExpiryText", linkExpirationFormatter(linkExpiration)))?no_esc}</p>
<p>${kcSanitize(msg("executeActionsIgnoreText"))?no_esc}</p>
</@layout.emailLayout>
