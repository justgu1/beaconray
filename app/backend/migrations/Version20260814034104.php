<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260814034104 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'BK-001: users, libraries, versions, audit_logs (jsonb + GIN, trigram search on libraries)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE audit_logs (id UUID NOT NULL, action VARCHAR(255) NOT NULL, entity_type VARCHAR(255) NOT NULL, entity_id UUID DEFAULT NULL, payload JSONB NOT NULL, ip_address VARCHAR(45) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, user_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_D62F2858A76ED395 ON audit_logs (user_id)');
        $this->addSql('CREATE TABLE libraries (id UUID NOT NULL, slug VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, metadata JSONB NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, user_id UUID NOT NULL, current_version_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_3ADD55A9A76ED395 ON libraries (user_id)');
        $this->addSql('CREATE INDEX IDX_3ADD55A99407EE77 ON libraries (current_version_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_library_user_slug ON libraries (user_id, slug)');
        $this->addSql('CREATE TABLE oauth2_access_token (identifier CHAR(80) NOT NULL, expiry TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, user_identifier VARCHAR(128) DEFAULT NULL, scopes TEXT DEFAULT NULL, revoked BOOLEAN NOT NULL, client VARCHAR(32) NOT NULL, PRIMARY KEY (identifier))');
        $this->addSql('CREATE INDEX IDX_454D9673C7440455 ON oauth2_access_token (client)');
        $this->addSql('CREATE TABLE oauth2_authorization_code (identifier CHAR(80) NOT NULL, expiry TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, user_identifier VARCHAR(128) DEFAULT NULL, scopes TEXT DEFAULT NULL, revoked BOOLEAN NOT NULL, client VARCHAR(32) NOT NULL, PRIMARY KEY (identifier))');
        $this->addSql('CREATE INDEX IDX_509FEF5FC7440455 ON oauth2_authorization_code (client)');
        $this->addSql('CREATE TABLE oauth2_client (name VARCHAR(128) NOT NULL, secret VARCHAR(128) DEFAULT NULL, redirect_uris TEXT DEFAULT NULL, grants TEXT DEFAULT NULL, scopes TEXT DEFAULT NULL, active BOOLEAN NOT NULL, allow_plain_text_pkce BOOLEAN DEFAULT false NOT NULL, identifier VARCHAR(32) NOT NULL, PRIMARY KEY (identifier))');
        $this->addSql('CREATE TABLE oauth2_refresh_token (identifier CHAR(80) NOT NULL, expiry TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, revoked BOOLEAN NOT NULL, access_token CHAR(80) DEFAULT NULL, PRIMARY KEY (identifier))');
        $this->addSql('CREATE INDEX IDX_4DD90732B6A2DD68 ON oauth2_refresh_token (access_token)');
        $this->addSql('CREATE TABLE users (id UUID NOT NULL, email VARCHAR(255) NOT NULL, password_hash VARCHAR(255) DEFAULT NULL, scopes JSONB NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_1483A5E9E7927C74 ON users (email)');
        $this->addSql('CREATE TABLE versions (id UUID NOT NULL, semver VARCHAR(64) NOT NULL, ast JSONB NOT NULL, compile_status VARCHAR(20) NOT NULL, artifact_paths JSONB NOT NULL, compiled_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, library_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_19DC40D2FE2541D7 ON versions (library_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_version_library_semver ON versions (library_id, semver)');
        $this->addSql('ALTER TABLE audit_logs ADD CONSTRAINT FK_D62F2858A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE libraries ADD CONSTRAINT FK_3ADD55A9A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE libraries ADD CONSTRAINT FK_3ADD55A99407EE77 FOREIGN KEY (current_version_id) REFERENCES versions (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE oauth2_access_token ADD CONSTRAINT FK_454D9673C7440455 FOREIGN KEY (client) REFERENCES oauth2_client (identifier) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE oauth2_authorization_code ADD CONSTRAINT FK_509FEF5FC7440455 FOREIGN KEY (client) REFERENCES oauth2_client (identifier) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE oauth2_refresh_token ADD CONSTRAINT FK_4DD90732B6A2DD68 FOREIGN KEY (access_token) REFERENCES oauth2_access_token (identifier) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE versions ADD CONSTRAINT FK_19DC40D2FE2541D7 FOREIGN KEY (library_id) REFERENCES libraries (id) NOT DEFERRABLE');

        $this->addSql('CREATE INDEX idx_libraries_metadata_gin ON libraries USING GIN (metadata jsonb_path_ops)');
        $this->addSql('CREATE INDEX idx_versions_ast_gin ON versions USING GIN (ast)');
        $this->addSql('CREATE INDEX idx_libraries_name_trgm ON libraries USING GIN (name gin_trgm_ops)');
        $this->addSql('CREATE INDEX idx_libraries_description_trgm ON libraries USING GIN (description gin_trgm_ops)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE audit_logs DROP CONSTRAINT FK_D62F2858A76ED395');
        $this->addSql('ALTER TABLE libraries DROP CONSTRAINT FK_3ADD55A9A76ED395');
        $this->addSql('ALTER TABLE libraries DROP CONSTRAINT FK_3ADD55A99407EE77');
        $this->addSql('ALTER TABLE oauth2_access_token DROP CONSTRAINT FK_454D9673C7440455');
        $this->addSql('ALTER TABLE oauth2_authorization_code DROP CONSTRAINT FK_509FEF5FC7440455');
        $this->addSql('ALTER TABLE oauth2_refresh_token DROP CONSTRAINT FK_4DD90732B6A2DD68');
        $this->addSql('ALTER TABLE versions DROP CONSTRAINT FK_19DC40D2FE2541D7');
        $this->addSql('DROP TABLE audit_logs');
        $this->addSql('DROP TABLE libraries');
        $this->addSql('DROP TABLE oauth2_access_token');
        $this->addSql('DROP TABLE oauth2_authorization_code');
        $this->addSql('DROP TABLE oauth2_client');
        $this->addSql('DROP TABLE oauth2_refresh_token');
        $this->addSql('DROP TABLE users');
        $this->addSql('DROP TABLE versions');
    }
}
