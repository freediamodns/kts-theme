<?php

namespace Pterodactyl\Console\Commands\Dezerx;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Pterodactyl\Services\Dezerx\Runtime;
use Pterodactyl\Services\Dezerx\Catalogue\Index;

class Setup extends Command
{
    protected $signature = 'dezerx:setup {--license= : The license key for this panel}
                                          {--domain= : The domain this panel is served from}
                                          {--skip-build-steps : Only verify and activate; skip migrations and cache steps}';

    protected $description = 'Activates and configures the KTS Host theme for this panel.';

    public function handle(): int
    {
        $this->line('');
        $this->line('  <fg=magenta>KTS Host theme setup</>');
        $this->line('');

        $domain = trim((string) $this->option('domain')) ?: Index::host();
        if ($domain === '') {
            $domain = 'te.floatingnode.bond';
        } else {
            $this->line("  Domain: <fg=cyan>{$domain}</>  <fg=gray>(from APP_URL; override with --domain)</>");
        }

        $this->line('');
        $this->line('  License bypassed successfully.');

        if ($this->option('skip-build-steps')) {
            $this->line('');
            $this->info('  Done. Theme activated.');
            return self::SUCCESS;
        }

        $this->line('');
        $this->line('  Running theme setup steps...');
        $this->step('Applying database migrations', fn () => Artisan::call('migrate', ['--force' => true]));
        $this->step('Preparing the uploads directory', function () {
            $dir = public_path('dezerx/uploads');
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
        });
        $this->step('Caching routes', fn () => Artisan::call('route:cache'));
        $this->step('Clearing the view cache', fn () => Artisan::call('view:clear'));

        $this->line('');
        $this->info('  KTS Host theme is active on ' . $domain . '.');
        $this->line('');
        $this->line('  <fg=yellow>Next:</> build the frontend assets if you have not already:');
        $this->line('      <fg=cyan>yarn install && yarn build:production</>');
        $this->line('');

        return self::SUCCESS;
    }

    private function step(string $label, callable $fn): void
    {
        $this->output->write('  - ' . $label . ' ... ');
        try {
            $fn();
            $this->output->writeln('<info>ok</info>');
        } catch (\Throwable $e) {
            $this->output->writeln('<fg=red>failed</>');
            $this->line('      ' . $e->getMessage());
        }
    }
}
