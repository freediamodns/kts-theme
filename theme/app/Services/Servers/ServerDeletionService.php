<?php

namespace Pterodactyl\Services\Servers;

use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\ConnectionInterface;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Services\Databases\DatabaseManagementService;
use Pterodactyl\Services\Dezerx\Subdomains\SubdomainManager;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

class ServerDeletionService
{
    protected bool $force = false;

    
    public function __construct(
        private ConnectionInterface $connection,
        private DaemonServerRepository $daemonServerRepository,
        private DatabaseManagementService $databaseManagementService,
        private SubdomainManager $subdomains,
    ) {
    }

    
    public function withForce(bool $bool = true): self
    {
        $this->force = $bool;

        return $this;
    }

    
    public function handle(Server $server): void
    {
        try {
            $this->daemonServerRepository->setServer($server)->delete();
        } catch (DaemonConnectionException $exception) {
            
            
            
            
            if (!$this->force && $exception->getStatusCode() !== Response::HTTP_NOT_FOUND) {
                throw $exception;
            }

            Log::warning($exception);
        }

        
        
        
        
        $subdomains = $this->subdomains->heldBy($server->id);

        $this->connection->transaction(function () use ($server) {
            foreach ($server->databases as $database) {
                try {
                    $this->databaseManagementService->delete($database);
                } catch (\Exception $exception) {
                    if (!$this->force) {
                        throw $exception;
                    }

                    
                    
                    
                    
                    
                    
                    $database->delete();

                    Log::warning($exception);
                }
            }

            
            $server->allocations()->update(['notes' => null]);

            $server->delete();
        });

        $this->subdomains->forget($subdomains);
    }
}
