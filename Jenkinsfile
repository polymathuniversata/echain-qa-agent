pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        NPM_CONFIG_CACHE = '${WORKSPACE}/.npm'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Environment') {
            steps {
                script {
                    // Install Node.js if not available
                    sh '''
                        if ! command -v node &> /dev/null; then
                            curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
                            sudo apt-get install -y nodejs
                        fi
                        node --version
                        npm --version
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('QA Checks') {
            steps {
                script {
                    try {
                        sh 'npm run qa'
                    } catch (Exception e) {
                        currentBuild.result = 'UNSTABLE'
                        echo "QA checks failed but continuing pipeline"
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'qa-report.json,docs/qalog.md', allowEmptyArchive: true
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'docs',
                        reportFiles: 'qalog.md',
                        reportName: 'QA Log'
                    ])
                }
            }
        }

        stage('Security Scan') {
            steps {
                script {
                    // Run security audit
                    sh 'npm audit --audit-level moderate || true'

                    // Check for secrets (basic implementation)
                    sh '''
                        if command -v gitleaks &> /dev/null; then
                            gitleaks detect --verbose --redact --config .gitleaks.toml || true
                        else
                            echo "Gitleaks not installed, skipping secret scanning"
                        fi
                    '''
                }
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
            post {
                always {
                    junit 'test-results.xml'
                    publishCoverage adapters: [coberturaAdapter('coverage/cobertura-coverage.xml')]
                }
            }
        }

        stage('Deploy Check') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                }
            }
            steps {
                script {
                    // Additional production checks
                    sh '''
                        export NODE_ENV=production
                        npm run qa
                    '''

                    // Create deployment package
                    sh '''
                        mkdir -p deploy
                        cp -r dist/* deploy/
                        cp package.json deploy/
                        cp README.md deploy/
                        tar -czf qa-agent-deploy.tar.gz deploy/
                    '''
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'qa-agent-deploy.tar.gz', fingerprint: true
                }
            }
        }
    }

    post {
        always {
            script {
                // Clean up
                sh 'rm -rf .npm deploy qa-agent-deploy.tar.gz || true'

                // Send notifications
                def qaReport = readJSON file: 'qa-report.json'
                def status = qaReport.errors > 0 ? 'FAILED' : qaReport.warnings > 0 ? 'WARNINGS' : 'PASSED'

                emailext(
                    subject: "QA Pipeline ${currentBuild.fullDisplayName} - ${status}",
                    body: """
                        QA Pipeline Results:

                        Status: ${status}
                        Duration: ${qaReport.duration}s
                        Errors: ${qaReport.errors}
                        Warnings: ${qaReport.warnings}

                        Build: ${env.BUILD_URL}
                        QA Log: ${env.BUILD_URL}QA_20Log/
                    """,
                    to: 'qa-team@company.com',
                    attachLog: true
                )
            }
        }

        success {
            echo 'Pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed!'
        }

        unstable {
            echo 'Pipeline completed with warnings!'
        }
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    triggers {
        // Run daily at 2 AM
        cron('H 2 * * *')

        // Run on push to main/develop
        pollSCM('H/15 * * * *')
    }
}