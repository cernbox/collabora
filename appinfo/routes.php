<?php
namespace OCA\Collabora\AppInfo;

$application = new Application();
$application->registerRoutes($this, [
    'routes' => [
        ['name' => 'editor#view', 'url' => '/view{file}', 'verb' => 'GET', 'requirements' => ['file' => '.+']],
        ['name' => 'editor#edit', 'url' => '/edit{file}', 'verb' => 'GET', 'requirements' => ['file' => '.+']],
        ['name' => 'editor#viewpl', 'url' => '/public/{token}/view{file}', 'verb' => 'GET', 'requirements' => ['file' => '.+']],
        ['name' => 'editor#editpl', 'url' => '/public/{token}/edit{file}', 'verb' => 'GET', 'requirements' => ['file' => '.+']],
    ]
]);