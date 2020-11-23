<?php

namespace OCA\Collabora\AppInfo;
use \OCP\AppFramework\App;
use \OCA\Collabora\Controller\EditorController;


class Application extends App {

	public function __construct (array $urlParams = []) {
		parent::__construct('collabora' , $urlParams);

		$container = $this->getContainer();

		$container->registerService('EditorController', function($c) {
			/** @var IContainer $c */
			return new EditorController(
				$c->query('AppName'),
				$c->query('Request')
			);
		});
	}
}
