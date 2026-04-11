{{/*
Common name for the chart.
*/}}
{{- define "authos.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fullname with release name.
*/}}
{{- define "authos.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "authos.labels" -}}
helm.sh/chart: {{ include "authos.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: authos-health
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Selector labels for a component.
*/}}
{{- define "authos.selectorLabels" -}}
app.kubernetes.io/name: {{ include "authos.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Image reference for a component.
*/}}
{{- define "authos.image" -}}
{{- $registry := .global.image.registry -}}
{{- $repo := .component.image.repository -}}
{{- $tag := default .global.image.tag (.component.image.tag | default "") -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repo $tag -}}
{{- else -}}
{{- printf "%s:%s" $repo $tag -}}
{{- end -}}
{{- end }}

{{/*
Database URL from external Postgres config.
*/}}
{{- define "authos.databaseUrl" -}}
postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@{{ .Values.postgresql.external.host }}:{{ .Values.postgresql.external.port }}/{{ .Values.postgresql.external.database }}
{{- end }}

{{/*
Redis URL from external Redis config.
*/}}
{{- define "authos.redisUrl" -}}
redis://{{ .Values.redis.external.host }}:{{ .Values.redis.external.port }}
{{- end }}
