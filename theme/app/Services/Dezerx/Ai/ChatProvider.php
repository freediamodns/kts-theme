<?php
 namespace Pterodactyl\Services\Dezerx\Ai; interface ChatProvider { public function converse(string $system, array $history, ToolBox $tools): AiReply; } 