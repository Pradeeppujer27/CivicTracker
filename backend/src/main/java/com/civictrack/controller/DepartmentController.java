package com.civictrack.controller;

import com.civictrack.entity.Category;
import com.civictrack.entity.Department;
import com.civictrack.service.DepartmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public ResponseEntity<List<Department>> getAllDepartments() {
        return ResponseEntity.ok(departmentService.getAllDepartments());
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(departmentService.getAllCategories());
    }

    @GetMapping("/{id}/categories")
    public ResponseEntity<List<Category>> getCategoriesByDepartment(@PathVariable Long id) {
        return ResponseEntity.ok(departmentService.getCategoriesByDepartment(id));
    }
}
