<?php

namespace Wusong8899\Email\Controllers;

use Egulias\EmailValidator\EmailValidator;
use Egulias\EmailValidator\Validation\DNSCheckValidation;
use Egulias\EmailValidator\Validation\MultipleValidationWithAnd;
use Egulias\EmailValidator\Validation\RFCValidation;
use Flarum\Group\Group;
use Flarum\Http\RequestUtil;
use Flarum\User\UserRepository;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Laminas\Diactoros\Response\EmptyResponse;
use Laminas\Diactoros\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ExportValidEmailsController implements RequestHandlerInterface
{
    public function __construct(protected UserRepository $users) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);

        // Admin-only
        $actor->assertInGroup(Group::ADMINISTRATOR_ID);

        // Ensure Intl is available for DNSCheckValidation requirements
        if (!extension_loaded('intl')) {
            return new Response\JsonResponse([
                'error' => 'PHP Intl extension is required for DNSCheckValidation.',
            ], 500);
        }

        $validator = new EmailValidator();
        $validation = new MultipleValidationWithAnd([
            new RFCValidation(),
            new DNSCheckValidation(),
        ]);

        $emailsSet = [];

        $query = $this->users->query();

        // Exclude banned/disabled/soft-deleted users when possible
        // Common Flarum fields: users table has 'is_activated', 'is_email_confirmed' varies by setup; we rely on non-null email and not suspended/soft-deleted
        $query->whereNotNull('email')
            ->where('email', '!=', '')
            ->where(function (Builder $q) {
                if ($this->columnExists($q, 'is_suspended')) {
                    $q->where('is_suspended', false);
                }
            })
            ->whereNull('deleted_at');

        $query->chunk(200, function ($users) use (&$emailsSet, $validator, $validation) {
            foreach ($users as $user) {
                $email = trim((string)$user->email);
                if ($email === '') {
                    continue;
                }
                if ($validator->isValid($email, $validation)) {
                    $key = strtolower($email);
                    $emailsSet[$key] = $email; // keep original case once
                }
            }
        });

        if (empty($emailsSet)) {
            return new Response\JsonResponse([
                'message' => 'No valid emails found',
                'count' => 0
            ], 204);
        }

        $date = date('Ymd');
        $filename = "valid-emails-{$date}.txt";
        $body = implode("\r\n", array_values($emailsSet)) . "\r\n";

        $response = new Response();
        $response = $response->withStatus(200)
            ->withHeader('Content-Type', 'text/plain; charset=UTF-8')
            ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"')
            ->withHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
            ->withHeader('Pragma', 'no-cache');

        $response->getBody()->write($body);

        return $response;
    }

    private function columnExists(Builder $query, string $column): bool
    {
        try {
            $connection = $query->getModel()->getConnection();
            $schema = $connection->getSchemaBuilder();
            return $schema->hasColumn($query->getModel()->getTable(), $column);
        } catch (\Throwable $e) {
            return false;
        }
    }
}
