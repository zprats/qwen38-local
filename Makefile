.PHONY: install install-uncensored install-agent start start-model start-research stop status security-check logs model-logs agent agent-plan agent-incident agent-research

install:
	./bin/install

install-uncensored: install
	./bin/install-uncensored

install-agent:
	./bin/install-agent

start:
	./bin/start

start-model:
	./bin/start-model

start-research:
	./bin/start-model research

stop:
	./bin/stop

status:
	./bin/status

security-check:
	./bin/security-check

logs:
	./bin/logs webui

model-logs:
	./bin/logs model

agent:
	./bin/qwen-agent

agent-plan:
	QWEN_LOCAL_MODE=plan ./bin/qwen-agent

agent-incident:
	QWEN_LOCAL_MODE=incident ./bin/qwen-agent

agent-research:
	QWEN_LOCAL_MODE=research ./bin/qwen-agent
