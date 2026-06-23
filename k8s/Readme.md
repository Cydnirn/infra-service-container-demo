# How to Deploy
# Preview what will be created
kubectl kustomize .

# Deploy everything
kubectl apply -k .

# Change a value, redeploy — only changed resources update
# (edit kustomization.yaml, then re-run the apply)
