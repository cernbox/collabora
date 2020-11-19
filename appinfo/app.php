<?php

namespace OCA\Collabora\AppInfo;

$app = new Application();

$domains = \OC::$server->getConfig()->getSystemValue("cbox.wopi.officeonline", ['https://qa.cernbox.cern.ch', 'https://cernbox.cern.ch']);
$policy = new \OCP\AppFramework\Http\EmptyContentSecurityPolicy();
foreach($domains as $domain) {
	$policy->addAllowedScriptDomain($domain);
	$policy->addAllowedFrameDomain($domain);
	$policy->addAllowedConnectDomain($domain);
}
\OC::$server->getContentSecurityPolicyManager()->addDefaultPolicy($policy);

\OCP\Util::addScript('collabora', 'script');
\OCP\Util::addStyle('collabora', 'style');
