
with open('apps/posts/src/posts.service.ts', 'r') as f:
    lines = f.readlines()

stack = []
class_start_line = -1
for i, line in enumerate(lines):
    if 'export class PostsService' in line:
        class_start_line = i
        break

if class_start_line == -1:
    print("Class not found")
    exit()

count = 0
found_start = False
for i in range(class_start_line, len(lines)):
    line = lines[i]
    for char in line:
        if char == '{':
            count += 1
            found_start = True
        elif char == '}':
            count -= 1
            if found_start and count == 0:
                print(f"Class ends at line {i+1}")
                exit()
