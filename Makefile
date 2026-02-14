install:
	npm ci

start:
	npm run dev

build:
	npm run build

deploy:
	npm run deploy

lint:
	npx eslint . --ext .js,.jsx,.ts,.tsx

connect:
	find . -maxdepth 10 \
		-not -path '*/.*' \
		-not -path './node_modules*' \
		-not -path './dist*' \
		-not -path './public*' \
		-type f \( \
			-name "*.js" -o \
			-name "*.jsx" -o \
			-name "*.ts" -o \
			-name "*.tsx" -o \
			-name "*.css" -o \
			-name "*.html" \
		\) \
		-exec sh -c 'for f; do echo "\n--- FILE: $$f ---"; cat "$$f"; done' sh {} + > react_project_code.txt
