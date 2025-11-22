# Kubernetes Manifests

Kubernetes deployment manifests for Argos services.

## Structure

- `deployments/` - Service deployments
- `services/` - Service definitions
- `configmaps/` - Configuration maps
- `secrets/` - Secret templates (not committed)
- `ingress/` - Ingress rules
- `monitoring/` - Prometheus and Grafana setup

## Deployment

```bash
# Apply all manifests
kubectl apply -f infrastructure/k8s/

# Or use Helm
helm install argos ./infrastructure/helm/argos
```

